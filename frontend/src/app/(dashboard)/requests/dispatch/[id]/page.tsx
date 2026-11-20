"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { RequestClientService } from "@/services/request.service";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import { UniversalPdfDownloadButton } from "@/components/pdf/UniversalPdfDownloadButton";
import { RequestDispatchPdfDocument } from "@/components/pdf/documents/RequestDispatchPdfDocument";
import { cn } from "@/lib/utils";
import type { InternalRequest } from "@/types/requests";
import type { AuthUser } from "@/types/auth";
import {
  ArrowLeft,
  PackageCheck,
  Calendar,
  Building2,
  User,
  Clock,
  Layers,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Check,
  ArrowRight,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface DispatchedItemView {
  id: number;
  productName: string;
  sku: string;
  lotNumber: string;
  expirationDate?: string | null;
  quantity: number;
  unit: string;
  unitCost?: number | null;
}

interface DispatchDetailView {
  movementId?: number;
  referenceNumber: string;
  requestId: number;
  requestNumber: string;
  departmentName: string;
  applicantName: string;
  dispatchedByName: string;
  dispatchedAt: string;
  status: string;
  notes?: string | null;
  items: DispatchedItemView[];
  hasPendingBalance: boolean;
}

export default function DispatchViewPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );
  const userRoles = currentUser?.roles || [];
  const isWarehouseStaff =
    userRoles.includes("ADMINISTRADOR") || userRoles.includes("ALMACENISTA");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dispatchData, setDispatchData] = useState<DispatchDetailView | null>(null);
  const [rawRequest, setRawRequest] = useState<InternalRequest | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        let requestMatch: InternalRequest | null = null;

        // 1. Intentar cargar directamente como ID de Solicitud
        try {
          requestMatch = await RequestClientService.getRequestById(id);
        } catch {
          // Si falla, no arrojar error todavía
        }

        // 2. Si no se encontró por ID de solicitud, verificar si el ID corresponde a un movimiento
        if (!requestMatch) {
          try {
            const allRequests = await RequestClientService.getRequests();
            const matchedByMov = allRequests.find(
              (r) =>
                String(r.dispatchedMovementId) === String(id) ||
                String(r.dispatchedMovement?.id) === String(id)
            );
            if (matchedByMov) {
              requestMatch = await RequestClientService.getRequestById(
                matchedByMov.id
              );
            }
          } catch {
            // Continuar con fallback
          }
        }

        // 3. Procesar datos de la Solicitud encontrada
        if (requestMatch) {
          setRawRequest(requestMatch);

          const mov = requestMatch.dispatchedMovement;
          const itemsList: DispatchedItemView[] = [];

          if (mov?.items && mov.items.length > 0) {
            mov.items.forEach((mIt, idx) => {
              itemsList.push({
                id: mIt.id ?? idx,
                productName:
                  mIt.batch?.product?.name ||
                  requestMatch?.items.find(
                    (i) => i.productId === mIt.batch?.productId
                  )?.product?.name ||
                  "Insumo",
                sku:
                  mIt.batch?.product?.sku ||
                  requestMatch?.items.find(
                    (i) => i.productId === mIt.batch?.productId
                  )?.product?.sku ||
                  "—",
                lotNumber: mIt.batch?.lotNumber || "—",
                expirationDate: mIt.batch?.expirationDate,
                quantity: Math.abs(Number(mIt.quantity || 0)),
                unit:
                  mIt.batch?.product?.baseUnit?.abbreviation ||
                  requestMatch?.items.find(
                    (i) => i.productId === mIt.batch?.productId
                  )?.product?.unitOfMeasure ||
                  "UND",
              });
            });
          } else {
            // Si el movimiento no trae renglones directos, tomar los despachados de la solicitud
            requestMatch.items.forEach((it, idx) => {
              const qtyDisp = Number(
                it.quantityDispatched ?? it.dispatchedQuantity ?? 0
              );
              if (qtyDisp > 0) {
                itemsList.push({
                  id: it.id ?? idx,
                  productName: it.product?.name || `Producto #${it.productId}`,
                  sku: it.product?.sku || "—",
                  lotNumber: it.batch?.lotNumber || "Lote Asignado",
                  expirationDate: it.batch?.expirationDate,
                  quantity: qtyDisp,
                  unit:
                    it.product?.unitOfMeasure ||
                    it.product?.baseUnit?.abbreviation ||
                    "UND",
                });
              }
            });
          }

          const hasPending = requestMatch.items.some((it) => {
            const appr = Number(it.quantityApproved ?? it.requestedQuantity ?? 0);
            const disp = Number(it.quantityDispatched ?? it.dispatchedQuantity ?? 0);
            return appr > disp;
          });

          // Obtener nombre del solicitante con todas las alternativas posibles
          const applicant =
            requestMatch.applicant?.fullName ||
            requestMatch.applicant?.username ||
            (requestMatch as any).user?.fullName ||
            (requestMatch as any).user?.username ||
            "Usuario solicitante";

          const department =
            requestMatch.departmentSection ||
            requestMatch.department?.name ||
            "Sin departamento";

          const dispatchedBy =
            mov?.createdBy?.fullName ||
            mov?.createdBy?.username ||
            requestMatch.approvedBy?.fullName ||
            "Personal de Almacén";

          if (isMounted) {
            setDispatchData({
              movementId: mov?.id,
              referenceNumber:
                mov?.referenceNumber || `MOV-DESP-${requestMatch.requestNumber}`,
              requestId: Number(requestMatch.id),
              requestNumber: requestMatch.requestNumber,
              departmentName: department,
              applicantName: applicant,
              dispatchedByName: dispatchedBy,
              dispatchedAt: mov?.createdAt || requestMatch.createdAt,
              status: requestMatch.status,
              notes: mov?.notes || requestMatch.notes,
              items: itemsList,
              hasPendingBalance: hasPending,
            });
          }
          return;
        }

        // 4. Fallback: Intentar como Movimiento de Stock directamente
        const movMatch = await InventoryClientService.getMovementById(id);
        if (movMatch) {
          const req = movMatch.requests?.[0];
          const itemsList: DispatchedItemView[] = (movMatch.items || []).map(
            (mIt: any, idx: number) => ({
              id: Number(mIt.id ?? idx),
              productName: mIt.batch?.product?.name || "Insumo",
              sku: mIt.batch?.product?.sku || "—",
              lotNumber: mIt.batch?.lotNumber || "—",
              expirationDate: mIt.batch?.expirationDate,
              quantity: Math.abs(Number(mIt.quantity || 0)),
              unit:
                mIt.batch?.product?.baseUnit?.abbreviation ||
                mIt.batch?.product?.unitOfMeasure ||
                "UND",
              unitCost: mIt.unitCost ? Number(mIt.unitCost) : null,
            })
          );

          const reqNum = req?.requestNumber || `SOL-#${id}`;
          const appName =
            req?.user?.fullName ||
            req?.user?.username ||
            movMatch.createdBy?.fullName ||
            "—";
          const deptName =
            req?.departmentSection ||
            req?.department?.name ||
            movMatch.originLocation?.name ||
            "Almacén General";

          if (isMounted) {
            setDispatchData({
              movementId: Number(movMatch.id),
              referenceNumber: movMatch.referenceNumber,
              requestId: req ? Number(req.id) : Number(id),
              requestNumber: reqNum,
              departmentName: deptName,
              applicantName: appName,
              dispatchedByName:
                movMatch.createdBy?.fullName ||
                movMatch.createdBy?.username ||
                "Personal de Almacén",
              dispatchedAt: movMatch.createdAt,
              status: req?.status || "COMPLETADA",
              notes: movMatch.notes,
              items: itemsList,
              hasPendingBalance: req?.status === "DESPACHADA_PARCIAL",
            });
          }
          return;
        }

        if (isMounted) {
          setError("No se encontró el comprobante de despacho solicitado.");
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar la información del despacho."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Cargando comprobante de despacho...
        </p>
      </div>
    );
  }

  if (error || !dispatchData) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Comprobante no disponible</h2>
        <p className="text-xs text-muted-foreground">{error || "Registro no encontrado."}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/requests/dispatch")}
        >
          Volver a Despachos
        </Button>
      </div>
    );
  }

  const totalDispatchedUnits = dispatchData.items.reduce(
    (sum, it) => sum + it.quantity,
    0
  );

  // Documento estructurado para la librería de PDF y Vista Previa
  const pdfRequestData = rawRequest || {
    id: dispatchData.requestId,
    requestNumber: dispatchData.requestNumber,
    departmentSection: dispatchData.departmentName,
    justification: dispatchData.notes || "Despacho de insumos de almacén",
    notes: dispatchData.notes,
    status: dispatchData.status,
    createdAt: dispatchData.dispatchedAt,
    dispatchedAt: dispatchData.dispatchedAt,
    applicant: {
      fullName: dispatchData.applicantName,
    },
    dispatchedBy: {
      fullName: dispatchData.dispatchedByName,
    },
    items: dispatchData.items.map((it) => ({
      id: it.id,
      quantityRequested: it.quantity,
      quantityDispatched: it.quantity,
      product: {
        name: it.productName,
        sku: it.sku,
        unitOfMeasure: it.unit,
      },
      batch: {
        lotNumber: it.lotNumber,
        expirationDate: it.expirationDate,
      },
    })),
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto w-full">
      {/* ========================================================
          ENCABEZADO ESTANDARIZADO
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push("/requests/dispatch")}
            className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Volver a Despachos"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Comprobante de Despacho
              </h1>
              <Badge variant="outline" className="font-mono text-xs font-semibold">
                {dispatchData.referenceNumber}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Detalle de salida física y entrega de insumos
            </p>
          </div>
        </div>

        {/* Acciones Superiores: Continuar despacho y Biblioteca de PDF */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {dispatchData.hasPendingBalance && isWarehouseStaff && dispatchData.requestId > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(
                  `/requests/dispatch/new?requestId=${dispatchData.requestId}`
                )
              }
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <PackageCheck className="w-3.5 h-3.5 text-primary" />
              <span>Continuar Despacho</span>
            </Button>
          )}

          {/* Botón integrado de PDF y Vista Previa oficial del sistema */}
          <UniversalPdfDownloadButton
            document={<RequestDispatchPdfDocument request={pdfRequestData as any} />}
            fileName={`Comprobante_Despacho_${String(dispatchData.referenceNumber || dispatchData.requestNumber).replace(/[^a-zA-Z0-9_-]/g, "_")}`}
            buttonLabel="Descargar PDF"
            previewLabel="Vista Previa"
            dialogTitle={`Comprobante de Despacho: ${dispatchData.referenceNumber}`}
          />
        </div>
      </div>

      {/* ========================================================
          DETALLES DEL DESPACHO
         ======================================================== */}
      <div className="space-y-6">
        {/* Tarjeta de Información de Entrega */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Información de Entrega
              </CardTitle>
              <Badge
                variant={
                  dispatchData.status === "COMPLETADA"
                    ? "success"
                    : dispatchData.status === "DESPACHADA_PARCIAL"
                    ? "purple"
                    : "outline"
                }
                className="text-xs font-semibold"
              >
                {dispatchData.status === "DESPACHADA_PARCIAL"
                  ? "Despacho Parcial"
                  : dispatchData.status === "COMPLETADA"
                  ? "Completada"
                  : dispatchData.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">
                N° Solicitud
              </span>
              <span className="font-mono font-bold text-foreground text-sm">
                #{dispatchData.requestNumber}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">
                Departamento
              </span>
              <span className="font-semibold text-foreground text-sm">
                {dispatchData.departmentName}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">
                Solicitante
              </span>
              <span className="font-medium text-foreground text-sm">
                {dispatchData.applicantName}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">
                Fecha y Hora
              </span>
              <span className="text-foreground font-medium">
                {new Date(dispatchData.dispatchedAt).toLocaleString("es-VE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">
                Comprobante
              </span>
              <span className="font-mono font-semibold text-foreground">
                {dispatchData.referenceNumber}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">
                Renglones
              </span>
              <span className="font-bold text-foreground">
                {dispatchData.items.length} insumo(s)
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">
                Total Unidades
              </span>
              <span className="font-bold text-foreground font-mono text-sm">
                {totalDispatchedUnits}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta de Custodia y Entrega (Entregado por y Recibido por / Usuario Final) */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Responsables de Custodia
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Entregado por
              </span>
              <p className="font-bold text-foreground text-sm">
                {dispatchData.dispatchedByName}
              </p>
              <span className="text-[11px] text-muted-foreground block">
                Personal de Almacén General
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Recibido por (Usuario final / Entrega para)
              </span>
              <p className="font-bold text-foreground text-sm">
                {dispatchData.applicantName}
              </p>
              <span className="text-[11px] text-muted-foreground block">
                {dispatchData.departmentName}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Observaciones / Motivo de Despacho si existe */}
        {dispatchData.notes && (
          <Card className="border-border shadow-2xs">
            <CardHeader className="pb-2 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Notas de entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                {dispatchData.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tabla de Insumos Despachados */}
        <Card className="border-border shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Insumos Entregados
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                  <TableHead className="w-12 text-xs font-semibold">#</TableHead>
                  <TableHead className="text-xs font-semibold">Insumo</TableHead>
                  <TableHead className="text-xs font-semibold">Código</TableHead>
                  <TableHead className="text-xs font-semibold">Lote</TableHead>
                  <TableHead className="text-xs font-semibold">Vencimiento</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Cantidad</TableHead>
                  <TableHead className="text-xs font-semibold">Unidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatchData.items.map((item, idx) => (
                  <TableRow key={item.id} className="hover:bg-muted/30 text-xs">
                    <TableCell className="font-mono text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {item.productName}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {item.sku}
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-foreground">
                      {item.lotNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.expirationDate
                        ? new Date(item.expirationDate).toLocaleDateString("es-VE")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
