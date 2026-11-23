"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PurchasingClientService } from "@/services/purchasing.service";
import type {
  PurchaseRequisition,
  PurchaseRequisitionStatus,
} from "@/types/purchasing";
import {
  UniversalPdfDownloadButton,
  RequisitionPdfDocument,
} from "@/components/pdf";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/common/TablePagination";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Building2,
  User,
  Calendar,
  Boxes,
  ShoppingCart,
  Mail,
  MessageCircle,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Search,
  X,
  RefreshCw,
  Info,
  StickyNote,
} from "lucide-react";

import { Card, CardTitle } from "@/components/ui/card";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const STATUS_BADGES: Record<
  PurchaseRequisitionStatus,
  {
    label: string;
    variant: "secondary" | "warning" | "success" | "destructive";
    className: string;
  }
> = {
  BORRADOR: {
    label: "Borrador",
    variant: "secondary",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  EN_COTIZACION: {
    label: "En Cotización",
    variant: "warning",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  ADJUDICADA: {
    label: "Adjudicada",
    variant: "success",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  CANCELADA: {
    label: "Cancelada",
    variant: "destructive",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
};

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export default function RequisitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const requisitionId = Array.isArray(rawId) ? rawId[0] : (rawId as string);

  const [requisition, setRequisition] = useState<PurchaseRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadDetail = useCallback(async () => {
    if (!requisitionId) return;
    setLoading(true);
    try {
      const data = await PurchasingClientService.getRequisitionById(requisitionId);
      setRequisition(data);
    } catch {
      setRequisition(null);
    } finally {
      setLoading(false);
    }
  }, [requisitionId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const summary = useMemo(() => {
    if (!requisition) {
      return { totalItems: 0, totalUnits: 0 };
    }
    const items = requisition.items || [];
    const totalUnits = items.reduce(
      (acc, it) => acc + Number(it.quantityRequested || 0),
      0
    );
    return {
      totalItems: items.length,
      totalUnits,
    };
  }, [requisition]);

  const filteredItems = useMemo(() => {
    const items = requisition?.items || [];
    if (!itemSearch.trim()) return items;
    const q = itemSearch.toLowerCase().trim();
    return items.filter(
      (it) =>
        (it.product?.name || "").toLowerCase().includes(q) ||
        (it.product?.sku || "").toLowerCase().includes(q) ||
        (it.unit?.name || "").toLowerCase().includes(q) ||
        (it.unit?.abbreviation || "").toLowerCase().includes(q)
    );
  }, [requisition, itemSearch]);

  const itemsPagination = usePagination(filteredItems, { initialPageSize: 10 });
  const { resetPage } = itemsPagination;

  useEffect(() => {
    resetPage();
  }, [itemSearch, resetPage]);

  const handleMoveToQuote = async () => {
    if (!requisition) return;
    setUpdatingStatus(true);
    setFeedback(null);
    try {
      await PurchasingClientService.updateRequisitionStatus(
        requisition.id,
        "EN_COTIZACION"
      );
      setFeedback({
        status: "success",
        message: `Preorden #${requisition.requisitionNumber} actualizada a En Cotización.`,
      });
      await loadDetail();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message: getErrorMessage(
          err,
          "Error al actualizar el estado de la preorden."
        ),
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendEmail = () => {
    if (!requisition) return;
    const itemsList = (requisition.items || [])
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.product?.name || "Insumo"} - Cantidad: ${it.quantityRequested} ${it.unit?.abbreviation || it.product?.baseUnit?.abbreviation || "UND"}`
      )
      .join("\n");

    const subject = encodeURIComponent(
      `Solicitud de Cotización / Preorden #${requisition.requisitionNumber} - Instituto de Inmunología Clínica IDI`
    );
    const body = encodeURIComponent(
      `Estimado proveedor,\n\nLe contactamos del Instituto de Inmunología Clínica IDI C.A. para solicitar formalmente cotización para los siguientes renglones:\n\n${itemsList}\n\nJustificación: ${requisition.justification || "Requerimiento operativo"}\n\nAgradecemos enviarnos su oferta con precios unitarios, disponibilidad y condición de pago.\n\nAtentamente,\nDepartamento de Compras y Suministros\nInstituto de Inmunología Clínica IDI`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleSendWhatsApp = () => {
    if (!requisition) return;
    const itemsList = (requisition.items || [])
      .map(
        (it, idx) =>
          `*${idx + 1}.* ${it.product?.name || "Insumo"} -> *${it.quantityRequested}* ${it.unit?.abbreviation || it.product?.baseUnit?.abbreviation || "UND"}`
      )
      .join("\n");

    const message = encodeURIComponent(
      `*Instituto de Inmunología Clínica IDI*\n*Preorden / Solicitud de Cotización #${requisition.requisitionNumber}*\n\nHola, un saludo cordial. Solicitamos cotización para los siguientes renglones:\n\n${itemsList}\n\nPor favor hacernos llegar su cotización a la brevedad posible. ¡Muchas gracias!`
    );
    window.open(`https://api.whatsapp.com/send?text=${message}`, "_blank");
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Cargando detalle de la preorden...
        </span>
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="p-6 text-center space-y-4 border-border shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Preorden no encontrada
            </h2>
            <p className="text-xs text-muted-foreground">
              No se pudo cargar la información de la preorden solicitada o no existe.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/purchasing/requisitions")}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a Preórdenes
          </Button>
        </Card>
      </div>
    );
  }

  const statusBadge = STATUS_BADGES[requisition.status] || {
    label: requisition.status,
    variant: "secondary" as const,
    className: "",
  };

  const canMoveToQuote = requisition.status === "BORRADOR";
  const canAdjudicate = requisition.status === "EN_COTIZACION";
  const hasOrders = Boolean(requisition.orders && requisition.orders.length > 0);
  const cleanJustification = requisition.justification
    .replace(/\[[A-Za-z0-9_\-]+\]\s*/g, "")
    .replace(/^•\s*/gm, "")
    .trim();

  const departmentLabel = requisition.department
    ? `${requisition.department.code} - ${requisition.department.name}`
    : requisition.departmentSection || "Sin departamento";

  const applicantArea =
    requisition.createdBy?.department ||
    requisition.department?.name ||
    requisition.departmentSection ||
    "";

  return (
    <div className="space-y-5 pb-12">
      {/* ========================================================
          NIVEL 1: ENCABEZADO Y ACCIONES PRINCIPALES
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
                Preorden #{requisition.requisitionNumber}
              </h1>
              <Badge
                variant={statusBadge.variant}
                className={cn("text-xs", statusBadge.className)}
              >
                {statusBadge.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Detalle de requisición y seguimiento de compra
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendEmail}
            className="h-9 gap-1.5 text-xs cursor-pointer shadow-2xs"
            title="Enviar solicitud de cotización por correo"
          >
            <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Correo</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendWhatsApp}
            className="h-9 gap-1.5 text-xs cursor-pointer shadow-2xs"
            title="Compartir solicitud de cotización por WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>WhatsApp</span>
          </Button>

          <UniversalPdfDownloadButton
            document={<RequisitionPdfDocument requisition={requisition} />}
            fileName={`Preorden_${String(requisition.requisitionNumber || requisition.id).replace(/[^a-zA-Z0-9_-]/g, "_")}`}
            buttonLabel="PDF"
            previewLabel="Vista Previa"
            dialogTitle={`Preorden: ${requisition.requisitionNumber}`}
          />

          {canMoveToQuote && (
            <Button
              type="button"
              size="sm"
              disabled={updatingStatus}
              onClick={handleMoveToQuote}
              className="h-9 gap-1.5 text-xs font-bold cursor-pointer bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
            >
              {updatingStatus ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Pasar a Cotización</span>
            </Button>
          )}

          {canAdjudicate && (
            <Button
              asChild
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
            >
              <Link href={`/purchasing/requisitions/${requisition.id}/adjudicate`}>
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Adjudicar</span>
              </Link>
            </Button>
          )}
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

      {/* ========================================================
          NIVEL 2: RESUMEN DE PRIMER CONOCIMIENTO
         ======================================================== */}
      <Card className="p-5 border-border shadow-2xs space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              Departamento
            </span>
            <p className="text-sm font-bold text-foreground leading-snug">
              {departmentLabel}
            </p>
            {requisition.departmentSection &&
              requisition.department?.name !== requisition.departmentSection && (
                <p className="text-[11px] text-muted-foreground">
                  {requisition.departmentSection}
                </p>
              )}
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              Solicitante
            </span>
            <p className="text-sm font-bold text-foreground leading-snug">
              {requisition.createdBy?.fullName || "Usuario del sistema"}
            </p>
            {applicantArea && (
              <p className="text-[11px] text-muted-foreground truncate">
                {applicantArea}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Fecha de Emisión
            </span>
            <p className="text-sm font-bold font-mono text-foreground leading-snug">
              {requisition.createdAt
                ? new Date(requisition.createdAt).toLocaleDateString("es-VE", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "-"}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {requisition.createdAt
                ? new Date(requisition.createdAt).toLocaleTimeString("es-VE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-primary" />
              Volumen Pedido
            </span>
            <p className="text-sm font-bold font-mono text-foreground leading-snug">
              {summary.totalItems}{" "}
              <span className="font-sans font-normal text-xs text-muted-foreground">
                {summary.totalItems === 1 ? "renglón" : "renglones"}
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {summary.totalUnits} unidades totales
            </p>
          </div>
        </div>

        {/* Justificación principal */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Justificación del Requerimiento
          </span>
          <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border whitespace-pre-line">
            {cleanJustification || "Sin justificación especificada."}
          </p>
        </div>
      </Card>

      {/* ========================================================
          NIVEL 3: ÓRDENES DE COMPRA GENERADAS (ANTES DE RENGLONES)
         ======================================================== */}
      {hasOrders && (
        <Card className="overflow-hidden border-emerald-500/30 shadow-2xs">
          <div className="px-4 py-3 border-b border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-sm font-bold text-foreground">
                Orden de Compra Generada
              </CardTitle>
            </div>
            <Badge
              variant="success"
              className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
            >
              Adjudicada
            </Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="py-2.5 px-4 text-xs font-semibold">N° Orden</TableHead>
                <TableHead className="py-2.5 px-4 text-xs font-semibold">Fecha</TableHead>
                <TableHead className="py-2.5 px-4 text-xs font-semibold text-center">Estado</TableHead>
                <TableHead className="py-2.5 px-4 text-xs font-semibold text-right">Monto USD</TableHead>
                <TableHead className="py-2.5 px-4 text-xs font-semibold text-center">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requisition.orders!.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/40 text-xs">
                  <TableCell className="py-2.5 px-4 font-mono font-bold text-foreground">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell className="py-2.5 px-4 text-muted-foreground">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString("es-VE")
                      : "-"}
                  </TableCell>
                  <TableCell className="py-2.5 px-4 text-center">
                    <Badge variant="outline" className="text-[11px]">
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 px-4 text-right font-mono font-semibold text-foreground">
                    {order.totalAmountUsd !== undefined
                      ? `$${Number(order.totalAmountUsd).toFixed(2)}`
                      : "-"}
                  </TableCell>
                  <TableCell className="py-2.5 px-4 text-center">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs font-semibold cursor-pointer"
                    >
                      <Link href={`/purchasing/orders/${order.id}`}>
                        <span>Ver Orden</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ========================================================
          NIVEL 4: RENGLONES SOLICITADOS (PAGINADOS + BUSCADOR)
         ======================================================== */}
      <Card className="overflow-hidden border-border shadow-2xs">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              Insumos Solicitados ({summary.totalItems})
            </CardTitle>
          </div>

          {summary.totalItems > 5 && (
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Filtrar insumo, SKU o unidad..."
                className="pl-8 pr-8 h-8 text-xs bg-background"
              />
              {itemSearch && (
                <button
                  type="button"
                  onClick={() => setItemSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="py-2.5 px-4 text-xs font-semibold w-12">#</TableHead>
              <TableHead className="py-2.5 px-4 text-xs font-semibold">Insumo / Reactivo</TableHead>
              <TableHead className="py-2.5 px-4 text-xs font-semibold text-center">Presentación</TableHead>
              <TableHead className="py-2.5 px-4 text-xs font-semibold text-right w-32">Cantidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                  No se encontraron renglones que coincidan con &ldquo;{itemSearch}&rdquo;.
                </TableCell>
              </TableRow>
            ) : (
              itemsPagination.paginatedItems.map((it, idx) => {
                const rowNumber =
                  (itemsPagination.currentPage - 1) * itemsPagination.pageSize + idx + 1;
                const presentationLabel =
                  it.unit?.name ||
                  it.unit?.abbreviation ||
                  it.product?.baseUnit?.name ||
                  it.product?.baseUnit?.abbreviation ||
                  "Unidad";

                return (
                  <TableRow key={it.id} className="hover:bg-muted/40 transition-colors text-xs">
                    <TableCell className="py-2.5 px-4 font-mono text-muted-foreground">
                      {rowNumber}
                    </TableCell>
                    <TableCell className="py-2.5 px-4">
                      <div className="font-semibold text-foreground">
                        {it.product?.name || "Insumo"}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {it.product?.sku && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            SKU: {it.product.sku}
                          </span>
                        )}
                        {it.product?.isTaxExempt !== undefined && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 font-normal"
                          >
                            {it.product.isTaxExempt ? "Exento IVA" : "Gravable 16%"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 px-4 text-center font-medium text-muted-foreground">
                      {presentationLabel}
                    </TableCell>
                    <TableCell className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                      {Number(it.quantityRequested)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {filteredItems.length > itemsPagination.pageSize && (
          <TablePagination
            currentPage={itemsPagination.currentPage}
            totalPages={itemsPagination.totalPages}
            pageSize={itemsPagination.pageSize}
            totalItems={itemsPagination.totalItems}
            onPageChange={itemsPagination.onPageChange}
            onPageSizeChange={itemsPagination.onPageSizeChange}
            pageSizeOptions={[10, 25, 50]}
            entityName="insumos"
          />
        )}
      </Card>

      {/* ========================================================
          NIVEL 5: DETALLES SECUNDARIOS Y TRAZABILIDAD (ABAJO)
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Observaciones */}
        <Card className="p-4 border-border/80 bg-muted/10 shadow-none space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <StickyNote className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Observaciones Adicionales
            </span>
          </div>
          {requisition.notes ? (
            <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
              {requisition.notes}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Sin observaciones logísticas registradas.
            </p>
          )}
        </Card>

        {/* Trazabilidad y Metadatos */}
        <Card className="p-4 border-border/80 bg-muted/10 shadow-none space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Info className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Registro y Trazabilidad
              </span>
            </div>
            <button
              type="button"
              onClick={() => void loadDetail()}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
              title="Actualizar datos"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Actualizar</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-[11px] pt-1">
            <div>
              <span className="text-muted-foreground block">Solicitante</span>
              <span className="font-semibold text-foreground">
                {requisition.createdBy?.fullName || "Usuario del sistema"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Correo electrónico</span>
              <span className="font-mono text-foreground">
                {requisition.createdBy?.email || "-"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Emitida el</span>
              <span className="font-mono text-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                {requisition.createdAt
                  ? new Date(requisition.createdAt).toLocaleString("es-VE")
                  : "-"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Última modificación</span>
              <span className="font-mono text-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                {requisition.updatedAt
                  ? new Date(requisition.updatedAt).toLocaleString("es-VE")
                  : "-"}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
