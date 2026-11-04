"use client";

import { useEffect, useState, useCallback } from "react";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import type {
  LabInternalRequest,
  FefoSuggestionItem,
  LabArea,
} from "@/types/lab-workflow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Truck,
  Sparkles,
  RefreshCw,
  Search,
  AlertCircle,
  Clock,
  User,
  Snowflake,
  PackageCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function CoordinatorRequestsPage() {
  const [requests, setRequests] = useState<LabInternalRequest[]>([]);
  const [areas, setAreas] = useState<LabArea[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [areaFilter, setAreaFilter] = useState<string>("ALL");

  // Modal de Aprobación FEFO
  const [selectedRequest, setSelectedRequest] = useState<LabInternalRequest | null>(null);
  const [fefoSuggestions, setFefoSuggestions] = useState<FefoSuggestionItem[]>([]);
  const [fefoLoading, setFefoLoading] = useState<boolean>(false);
  const [assignedUnits, setAssignedUnits] = useState<Record<number, string>>({});
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [isApproveOpen, setIsApproveOpen] = useState<boolean>(false);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  // Modal de Rechazo
  const [rejectRequestId, setRejectRequestId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [isRejectOpen, setIsRejectOpen] = useState<boolean>(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqData, areaData] = await Promise.all([
        LabWorkflowService.getInternalRequests({
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          labAreaId: areaFilter !== "ALL" ? Number(areaFilter) : undefined,
        }),
        LabWorkflowService.getLabAreas(),
      ]);
      setRequests(reqData);
      setAreas(areaData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar solicitudes internas";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, areaFilter]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  // Abrir Modal FEFO
  const handleOpenFefoModal = async (req: LabInternalRequest) => {
    setSelectedRequest(req);
    setIsApproveOpen(true);
    setFefoLoading(true);
    setReviewNotes("");
    setAssignedUnits({});

    try {
      const suggestions = await LabWorkflowService.suggestFefoForRequest(req.id);
      setFefoSuggestions(suggestions);

      // Pre-asignar la primera sugerencia automática (la más óptima FEFO)
      const initialMap: Record<number, string> = {};
      suggestions.forEach((sug) => {
        if (sug.suggestedUnits.length > 0) {
          initialMap[sug.requestItemId] = String(sug.suggestedUnits[0].id);
        }
      });
      setAssignedUnits(initialMap);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al calcular FEFO";
      setError(msg);
    } finally {
      setFefoLoading(false);
    }
  };

  // Confirmar Aprobación FEFO
  const handleConfirmApproval = async () => {
    if (!selectedRequest) return;
    setSubmittingAction(true);
    try {
      const itemAssignments = Object.entries(assignedUnits).map(([itemId, unitId]) => ({
        itemId: Number(itemId),
        assignedLabUnitId: unitId,
      }));

      await LabWorkflowService.approveInternalRequest(selectedRequest.id, {
        reviewNotes: reviewNotes || "Aprobado con asignación FEFO de lote",
        itemAssignments,
      });

      setIsApproveOpen(false);
      await loadRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al aprobar solicitud";
      alert(msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Entregar / Habilitar insumos a la nevera del área
  const handleDeliver = async (requestId: number) => {
    if (!confirm("¿Confirmar entrega física de los reactivos al Bioanalista del área?")) return;
    setSubmittingAction(true);
    try {
      await LabWorkflowService.deliverInternalRequest(requestId);
      await loadRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al entregar reactivos";
      alert(msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Rechazar Solicitud
  const handleConfirmReject = async () => {
    if (!rejectRequestId || !rejectReason.trim()) return;
    setSubmittingAction(true);
    try {
      await LabWorkflowService.rejectInternalRequest(rejectRequestId, {
        reviewNotes: rejectReason,
      });
      setIsRejectOpen(false);
      setRejectRequestId(null);
      setRejectReason("");
      await loadRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al rechazar solicitud";
      alert(msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_REVIEW":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Pendiente FEFO</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-600 hover:bg-blue-700">Aprobado / Asignado</Badge>;
      case "DELIVERED":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">Entregado a Nevera</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros */}
      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los estados</SelectItem>
                    <SelectItem value="PENDING_REVIEW">Pendientes de Revisión</SelectItem>
                    <SelectItem value="APPROVED">Aprobados</SelectItem>
                    <SelectItem value="DELIVERED">Entregados</SelectItem>
                    <SelectItem value="REJECTED">Rechazados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-52">
                <Select value={areaFilter} onValueChange={setAreaFilter}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Área solicitante" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas las áreas</SelectItem>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadRequests()}
              disabled={loading}
              className="text-xs gap-1.5 h-9"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabla de Solicitudes */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-blue-600" />
            <span>Bandeja de Requisición y Despacho de Reactivos Clínicos</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Asigna frascos con caducidad más cercana aplicando la directriz FEFO para minimizar mermas.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-xs">
                  <TableHead className="w-[130px]">Código</TableHead>
                  <TableHead>Área Destino</TableHead>
                  <TableHead>Solicitado Por</TableHead>
                  <TableHead>Ítems / Pruebas</TableHead>
                  <TableHead>Justificación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones de Coordinación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay solicitudes registradas con los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-bold text-foreground">
                        {req.code}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium text-[10px]">
                          {req.labArea.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{req.requestedBy.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {req.items.map((i) => (
                            <div key={i.id} className="text-[11px] font-medium text-foreground">
                              &bull; {i.product?.name || "Reactivo"} ({i.requestedUsesOrUnits} usos)
                              {i.assignedLabUnit && (
                                <span className="ml-1 text-[10px] text-blue-600 font-mono">
                                  [{i.assignedLabUnit.unitCode} - {i.assignedLabUnit.batch?.lotNumber}]
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground" title={req.justification}>
                        {req.justification}
                      </TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {req.status === "PENDING_REVIEW" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => void handleOpenFefoModal(req)}
                                className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1"
                              >
                                <Sparkles className="w-3 h-3" />
                                Asignar FEFO
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRejectRequestId(req.id);
                                  setIsRejectOpen(true);
                                }}
                                className="h-7 text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                              >
                                Rechazar
                              </Button>
                            </>
                          )}

                          {req.status === "APPROVED" && (
                            <Button
                              size="sm"
                              onClick={() => void handleDeliver(req.id)}
                              disabled={submittingAction}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            >
                              <Truck className="w-3 h-3" />
                              Entregar a Nevera
                            </Button>
                          )}

                          {req.status === "DELIVERED" && (
                            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 justify-end">
                              <PackageCheck className="w-3.5 h-3.5" />
                              Completado
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL DE ASIGNACIÓN FEFO */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>Aprobación y Asignación FEFO Automática</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Revisión de solicitud {selectedRequest?.code} para {selectedRequest?.labArea.name}. El sistema prioriza frascos con caducidad más temprana.
            </DialogDescription>
          </DialogHeader>

          {fefoLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span>Consultando stock y calculando lotes FEFO...</span>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-3">
                {fefoSuggestions.map((sug) => (
                  <div key={sug.requestItemId} className="p-3 bg-muted/30 rounded-lg border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {sug.productName} ({sug.sku})
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Requeridos: <strong className="text-foreground">{sug.requestedUsesOrUnits} usos</strong>
                      </span>
                    </div>

                    {sug.suggestedUnits.length === 0 ? (
                      <Alert variant="destructive" className="py-2 text-xs">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <AlertTitle className="text-xs">Sin stock en neveras</AlertTitle>
                        <AlertDescription className="text-[11px]">
                          No se encontraron frascos disponibles de este producto. Debe ingresarse stock a través de almacén.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Frasco Recomendado por FEFO:
                        </label>
                        <Select
                          value={assignedUnits[sug.requestItemId] || ""}
                          onValueChange={(val) =>
                            setAssignedUnits((prev) => ({ ...prev, [sug.requestItemId]: val }))
                          }
                        >
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue placeholder="Seleccionar frasco asignado" />
                          </SelectTrigger>
                          <SelectContent>
                            {sug.suggestedUnits.map((u, idx) => (
                              <SelectItem key={String(u.id)} value={String(u.id)}>
                                {idx === 0 ? "★ [RECOMENDADO FEFO] " : ""}
                                {u.unitCode} &bull; Lote: {u.lotNumber} &bull; Vence:{" "}
                                {u.expirationDate ? new Date(u.expirationDate).toLocaleDateString() : "S/F"}{" "}
                                &bull; Vol: {u.currentVolume} usos &bull; {u.fridgeName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Notas de Revisión / Observaciones del Coordinador:
                </label>
                <Textarea
                  placeholder="Comentarios o instrucciones para el bioanalista..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="text-xs min-h-[60px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApproveOpen(false)}
              disabled={submittingAction}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => void handleConfirmApproval()}
              disabled={submittingAction || fefoLoading}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              {submittingAction && <RefreshCw className="w-3 h-3 animate-spin" />}
              Confirmar Aprobación FEFO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE RECHAZO */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-destructive flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              <span>Rechazar Solicitud Interna</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Indica el motivo por el cual no procede la entrega de estos reactivos.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-[11px] font-semibold text-foreground block mb-1">
              Motivo de Rechazo (Obligatorio):
            </label>
            <Textarea
              placeholder="Ej. Falta de justificación médica, kit fuera de vigencia, stock insuficiente..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="text-xs min-h-[80px]"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejectOpen(false)}
              disabled={submittingAction}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleConfirmReject()}
              disabled={submittingAction || !rejectReason.trim()}
              className="text-xs"
            >
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
