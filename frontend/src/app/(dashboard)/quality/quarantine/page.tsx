"use client";

import { useState, useEffect, useCallback, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { QualityClientService } from "@/services/quality.service";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import type {
  QuarantineBatch,
  QualityVerdict,
  IncidentType,
} from "@/types/quality";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileCheck,
  Package,
  AlertTriangle,
  Building,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const INCIDENT_LABELS: Record<IncidentType, string> = {
  FALLA_CONTROL_CALIDAD: "Falla de Control de Calidad / Reactividad",
  TEMPERATURA_FUERA_RANGO: "Ruptura de Cadena de Frío / Temperatura",
  ROTURA_EMPAQUE: "Rotura o Daño Físico de Empaque",
  CONTAMINACION: "Contaminación o Turbidez del Insumo",
  OTRO: "Otra no conformidad técnica",
};

export default function QualityQuarantinePage() {
  const router = useRouter();
  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser(),
  );
  const [, startTransition] = useTransition();

  const userRoles = currentUser?.roles || [];
  const isAuthorized =
    userRoles.includes("ADMINISTRADOR") || userRoles.includes("ALMACENISTA");

  const [batches, setBatches] = useState<QuarantineBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<
    "EN_CUARENTENA" | "DEFECTUOSO"
  >("EN_CUARENTENA");

  // Modal / Formulario de Dictamen
  const [selectedBatch, setSelectedBatch] = useState<QuarantineBatch | null>(
    null,
  );
  const [verdict, setVerdict] = useState<QualityVerdict>("LIBERAR");
  const [incidentType, setIncidentType] = useState<IncidentType>(
    "FALLA_CONTROL_CALIDAD",
  );
  const [technicalNotes, setTechnicalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadQuarantine = useCallback(async (status: "EN_CUARENTENA" | "DEFECTUOSO") => {
    setLoading(true);
    try {
      const data = await QualityClientService.getBatchesByStatus(status);
      setBatches(data);
    } catch {
      // Interceptor global gestiona el error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    const init = async () => {
      if (isMounted) {
        await loadQuarantine(activeStatus);
      }
    };
    void init();

    return () => {
      isMounted = false;
    };
  }, [router, activeStatus, loadQuarantine]);

  const handleTabChange = (status: "EN_CUARENTENA" | "DEFECTUOSO") => {
    startTransition(() => {
      setActiveStatus(status);
    });
  };

  const handleOpenInspection = (batch: QuarantineBatch) => {
    if (!isAuthorized) return;
    setSelectedBatch(batch);
    setVerdict("LIBERAR");
    setIncidentType("FALLA_CONTROL_CALIDAD");
    setTechnicalNotes("");
    setFeedback(null);
  };

  const isQuarantine = activeStatus === "EN_CUARENTENA";

  const handleCloseInspection = () => {
    setSelectedBatch(null);
    setTechnicalNotes("");
    setFeedback(null);
  };

  const handleSubmitVerdict = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !isAuthorized) return;

    if (technicalNotes.trim().length < 5) {
      setFeedback({
        status: "error",
        message:
          "Debe ingresar una justificación técnica de al menos 5 caracteres.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await QualityClientService.submitVerdict({
        batchId: Number(selectedBatch.id),
        verdict,
        incidentType: verdict === "RECHAZAR" ? incidentType : undefined,
        technicalNotes: technicalNotes.trim(),
      });

      setFeedback({
        status: "success",
        message: res.message,
      });

      await loadQuarantine(activeStatus);
      setTimeout(() => {
        handleCloseInspection();
      }, 1200);
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Ocurrió un error al procesar el dictamen de calidad.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
            Bandeja de Incidencias / Cuarentena
          </h1>
          <p className="text-xs text-muted-foreground">
            Bandeja de excepciones para lotes retenidos por ingreso no conforme, revisión técnica analítica o incidencias de calidad
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => void loadQuarantine(activeStatus)}
          title="Actualizar lista"
          className="self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Banner Informativo si no es personal autorizado */}
      {!isAuthorized && (
        <Alert>
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
          <AlertDescription>
            Modo de consulta (solo lectura): La liberación de lotes, dictámenes técnicos y bajas a merma son competencia exclusiva del personal de <strong>Almacén</strong> o <strong>Administración</strong>.
          </AlertDescription>
        </Alert>
      )}

      {/* Selector de Pestaña */}
      <Tabs
        value={activeStatus}
        onValueChange={(val) => handleTabChange(val as "EN_CUARENTENA" | "DEFECTUOSO")}
        className="w-full"
      >
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="EN_CUARENTENA" className="text-xs">
            Lotes Retenidos (Incidencias)
          </TabsTrigger>
          <TabsTrigger value="DEFECTUOSO" className="text-xs">
            Rechazados / Defectuosos
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tabla de Cuarentena */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="py-3 px-4">Lote</TableHead>
                <TableHead className="py-3 px-4">Producto & SKU</TableHead>
                <TableHead className="py-3 px-4">Ubicación Actual</TableHead>
                <TableHead className="py-3 px-4 text-right">Cantidad</TableHead>
                <TableHead className="py-3 px-4">Vencimiento</TableHead>
                <TableHead className="py-3 px-4">Fecha Ingreso</TableHead>
                <TableHead className="py-3 px-4 text-center">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600 mb-2" />
                    Consultando lotes en auditoría...
                  </TableCell>
                </TableRow>
              ) : batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    {isQuarantine
                      ? "No hay lotes retenidos en esta bandeja de excepciones. Todos los insumos ingresados están conformes en inventario disponible."
                      : "No existen lotes declarados como defectuosos."}
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => (
                  <TableRow
                    key={String(batch.id)}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="py-3 px-4 font-mono font-bold text-amber-900">
                      #{batch.lotNumber}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="font-semibold text-foreground">
                        {batch.product.name}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        SKU: {batch.product.sku}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-muted-foreground" />
                        {batch.location?.name ?? "Almacén Central"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right font-bold text-foreground font-mono">
                      {batch.currentQuantity} {batch.product.unitOfMeasure}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground font-mono">
                      {batch.expirationDate
                        ? new Date(batch.expirationDate).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      {isQuarantine ? (
                        isAuthorized ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenInspection(batch)}
                            className="h-7 text-xs font-semibold gap-1.5 border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            Inspeccionar
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-[11px]">
                            Solo Lectura
                          </Badge>
                        )
                      ) : (
                        <Badge variant="destructive" className="gap-1 text-[11px]">
                          <XCircle className="w-3 h-3" /> Inutilizado
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal de Dictamen Técnico */}
      <Dialog
        open={Boolean(selectedBatch && isAuthorized)}
        onOpenChange={(open) => {
          if (!open) handleCloseInspection();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <DialogTitle className="text-base font-bold text-foreground">
                Dictamen de Control de Calidad
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* Ficha del Lote */}
          {selectedBatch && (
            <div className="bg-muted/50 p-3 rounded-xl border border-border text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  {selectedBatch.product.name}
                </span>
                <span className="font-mono text-amber-800 font-bold">
                  Lote #{selectedBatch.lotNumber}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span>SKU: {selectedBatch.product.sku}</span>
                <span className="font-mono font-bold text-foreground">
                  Existencia: {selectedBatch.currentQuantity}{" "}
                  {selectedBatch.product.unitOfMeasure}
                </span>
              </div>
            </div>
          )}

          {feedback && (
            <Alert
              variant={feedback.status === "success" ? "default" : "destructive"}
              className={feedback.status === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : ""}
            >
              {feedback.status === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmitVerdict} className="space-y-4">
            <div>
              <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                Resolución del Análisis
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={verdict === "LIBERAR" ? "default" : "outline"}
                  onClick={() => setVerdict("LIBERAR")}
                  className={
                    verdict === "LIBERAR"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                      : "gap-2"
                  }
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Aprobar y Liberar
                </Button>

                <Button
                  type="button"
                  variant={verdict === "RECHAZAR" ? "destructive" : "outline"}
                  onClick={() => setVerdict("RECHAZAR")}
                  className="gap-2 font-bold"
                >
                  <XCircle className="w-4 h-4" />
                  Rechazar Lote
                </Button>
              </div>
            </div>

            {/* Si se rechaza, desplegar selector de Incidente */}
            {verdict === "RECHAZAR" && (
              <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20 space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-bold text-destructive uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Causa del Rechazo (Incidente Sanitario) *
                </Label>
                <select
                  value={incidentType}
                  onChange={(e) =>
                    setIncidentType(e.target.value as IncidentType)
                  }
                  className="w-full bg-background border border-input rounded-md px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  {Object.entries(INCIDENT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Informe Técnico / Justificación del Dictamen *
              </Label>
              <Textarea
                rows={3}
                value={technicalNotes}
                onChange={(e) => setTechnicalNotes(e.target.value)}
                placeholder="Detalles sobre temperatura de llegada, controles analíticos o motivo del rechazo (mínimo 5 caracteres)..."
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseInspection}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Procesando..." : "Confirmar Dictamen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
