"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import type { LabWeeklyRun } from "@/types/lab-workflow";
import type { LabFridge, LabReagentUnitItem } from "@/types/laboratory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Snowflake,
  FlaskConical,
  ClipboardList,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Thermometer,
  Layers,
  Calendar,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  UniversalPdfDownloadButton,
  CustomReportPdfDocument,
} from "@/components/pdf";

export default function LabGeneralDashboardPage() {
  const [fridges, setFridges] = useState<LabFridge[]>([]);
  const [units, setUnits] = useState<LabReagentUnitItem[]>([]);
  const [activeRuns, setActiveRuns] = useState<LabWeeklyRun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime] = useState(() => Date.now());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [, fridgesData, unitsData, allRuns] = await Promise.all([
        LabWorkflowService.getMyLabAreas(),
        LabWorkflowService.getFridges(),
        LabWorkflowService.getLabUnits(),
        LabWorkflowService.getWeeklyRuns(),
      ]);
      setFridges(fridgesData);
      setUnits(unitsData);

      // Filtrar corridas abiertas
      const openRuns = allRuns.filter(
        (r) =>
          r.status === "OPEN_ACCUMULATING" ||
          (r.status as string) === "IN_PROGRESS" ||
          (r.status as string) === "PENDING_RECONCILIATION"
      );
      setActiveRuns(openRuns);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar el tablero de laboratorio";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchBoard = async () => {
      try {
        const [, fridgesData, unitsData, allRuns] = await Promise.all([
          LabWorkflowService.getMyLabAreas(),
          LabWorkflowService.getFridges(),
          LabWorkflowService.getLabUnits(),
          LabWorkflowService.getWeeklyRuns(),
        ]);
        if (active) {
          setFridges(fridgesData);
          setUnits(unitsData);
          const openRuns = allRuns.filter(
            (r) =>
              r.status === "OPEN_ACCUMULATING" ||
              (r.status as string) === "IN_PROGRESS" ||
              (r.status as string) === "PENDING_RECONCILIATION"
          );
          setActiveRuns(openRuns);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : "Error al cargar el tablero de laboratorio";
          setError(msg);
          setLoading(false);
        }
      }
    };
    void fetchBoard();
    return () => {
      active = false;
    };
  }, []);

  // Alertas de frascos críticos (volumen <= 20%, próximos a vencer <= 30 días, o vencidos)
  const criticalUnits = useMemo(() => {
    const now = currentTime;
    return units.filter((u) => {
      const isActive = u.status === "EN_USO" || u.status === "SELLADO";
      if (!isActive) return false;

      const currentVol = Number(u.currentVolume ?? u.remainingUses ?? 0);
      const initVol = Number(u.initialVolume ?? u.initialTheoreticalUses ?? 1);
      const isLow = currentVol <= initVol * 0.2;

      const isExpiring = u.expirationDate
        ? new Date(u.expirationDate).getTime() - now < 30 * 24 * 60 * 60 * 1000
        : false;

      return isLow || isExpiring;
    });
  }, [units, currentTime]);

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
            <span>Centro de Control Analítico</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Tablero General de Laboratorio Clínico
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoreo en tiempo real de cadena de frío, reactivos en mesón, alertas FEFO y corridas semanales activas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={loading}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Actualizar
          </Button>

          <UniversalPdfDownloadButton
            document={
              <CustomReportPdfDocument
                title="ESTADO OPERATIVO GENERAL DE LABORATORIO CLÍNICO"
                subtitle="RESUMEN EJECUTIVO DE CADENA DE FRÍO, REACTIVOS EN MESÓN Y CORRIDAS"
                documentNumber={`LAB-DASH-${new Date().toISOString().slice(0, 10)}`}
                orientation="landscape"
                columns={[
                  { key: "item", label: "Componente / Módulo", width: "25%", bold: true },
                  { key: "metric", label: "Indicador Operativo", width: "25%" },
                  { key: "status", label: "Estado Técnico", width: "25%" },
                  { key: "details", label: "Observaciones", width: "25%", align: "right" },
                ]}
                rows={[
                  {
                    item: "Cadena de Frío & Cavas",
                    metric: `${fridges.length} Neveras registradas`,
                    status: fridges.every((f) => f.status === "OPERATIVO") ? "NORMAL (2°C-8°C)" : "ALERTA TÉRMICA",
                    details: `${fridges.filter((f) => f.status === "OPERATIVO").length} operativas`,
                  },
                  {
                    item: "Reactivos en Mesón (En Uso)",
                    metric: `${units.filter((u) => u.status === "EN_USO").length} Viales abiertos`,
                    status: "EN PROCESO",
                    details: `+${units.filter((u) => u.status === "SELLADO").length} en reserva`,
                  },
                  {
                    item: "Corridas Analíticas",
                    metric: `${activeRuns.length} Corridas abiertas`,
                    status: activeRuns.length > 0 ? "ACUMULANDO" : "AL DÍA",
                    details: "Listas para liquidación 5D",
                  },
                  {
                    item: "Control FEFO & Vencimientos",
                    metric: `${criticalUnits.length} Viales en alerta`,
                    status: criticalUnits.length === 0 ? "ÓPTIMO" : "ACCIÓN REQUERIDA",
                    details: criticalUnits.length === 0 ? "Sin vencimientos próximos" : "Stock <= 20% o < 30 días",
                  },
                ]}
                summaryItems={[
                  { label: "Neveras Operativas", value: fridges.filter((f) => f.status === "OPERATIVO").length },
                  { label: "Frascos en Uso", value: units.filter((u) => u.status === "EN_USO").length },
                  { label: "Corridas Activas", value: activeRuns.length },
                  { label: "Alertas FEFO", value: criticalUnits.length },
                ]}
              />
            }
            fileName={`Estado_General_Laboratorio_${new Date().toISOString().slice(0, 10)}`}
            buttonLabel="Informe General PDF"
            previewLabel="Vista Previa"
            size="sm"
          />

          <Button asChild size="sm" className="text-xs gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
            <Link href="/lab/runs">
              <FlaskConical className="w-3.5 h-3.5" />
              Aperturar Corrida
            </Link>
          </Button>

          <Button asChild size="sm" variant="outline" className="text-xs gap-1.5 h-9">
            <Link href="/lab/requests">
              <ClipboardList className="w-3.5 h-3.5" />
              Requisición FEFO
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Error de comunicación</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tarjetas KPI de Estado Operativo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Neveras / Cavas</span>
              <Snowflake className="w-4 h-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold font-mono text-foreground">{fridges.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {fridges.filter((f) => f.status === "OPERATIVO").length} operativas en temperatura
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Frascos en Mesón (EN USO)</span>
              <FlaskConical className="w-4 h-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              {units.filter((u) => u.status === "EN_USO").length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              +{units.filter((u) => u.status === "SELLADO").length} sellados en reserva de cava
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Corridas en Curso</span>
              <Activity className="w-4 h-4 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold font-mono text-indigo-600">{activeRuns.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Listas para conciliación y descuento
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Alertas FEFO Críticas</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold font-mono text-amber-600">{criticalUnits.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Stock bajo (&le;20%) o por expirar
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Principal (2 columnas): Neveras y Corridas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Monitor de Cavas y Neveras */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-blue-600" />
                  <span>Monitoreo Térmico de Cavas & Neveras</span>
                </CardTitle>
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                  <Link href="/lab/fridges">Administrar neveras &rarr;</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {loading ? (
                <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">
                  Cargando estado térmico de cavas...
                </div>
              ) : fridges.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 italic">
                  No hay neveras registradas. Vaya a Neveras & Cadena de Frío para configurar una.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {fridges.map((f) => {
                    const fridgeUnits = units.filter((u) => u.fridgeId === f.id);
                    const isFaulty = f.status === "DEFECTUOSO";

                    return (
                      <div
                        key={f.id}
                        className={cn(
                          "p-3.5 rounded-xl border bg-card shadow-xs transition-all space-y-2.5",
                          isFaulty
                            ? "border-red-300 dark:border-red-900 bg-red-50/20"
                            : "border-border hover:border-blue-300 dark:hover:border-blue-800"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold bg-muted px-1.5 py-0.5 rounded text-foreground">
                              {f.code}
                            </span>
                            <span className="font-semibold text-sm text-foreground truncate max-w-[150px]">
                              {f.name}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              f.status === "OPERATIVO"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : "bg-rose-50 text-rose-700 border-rose-300 font-bold"
                            )}
                          >
                            {f.status === "OPERATIVO"
                              ? "Operativo"
                              : f.status === "DEFECTUOSO"
                              ? "Falla Térmica"
                              : f.status === "MANTENIMIENTO"
                              ? "En Mantenimiento"
                              : f.status}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                          <div className="flex items-center gap-1">
                            <Thermometer className="w-3.5 h-3.5 text-blue-500" />
                            <span>Temp. Objetivo:</span>
                            <strong className="text-foreground font-mono">
                              {f.targetTempCelsius !== null ? `${f.targetTempCelsius}°C` : "Ambiente"}
                            </strong>
                          </div>
                          <div className="flex items-center gap-1 font-mono">
                            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{fridgeUnits.length} viales</span>
                          </div>
                        </div>

                        <div className="pt-1 flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground truncate max-w-[150px]">
                            {f.location?.name || "Sin ubicación fija"}
                          </span>
                          <Link
                            href="/lab/fridges"
                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-[11px]"
                          >
                            Ver Frascos &rarr;
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Corridas Semanales Clínicas Abiertas */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <span>Corridas Semanales Abiertas ({activeRuns.length})</span>
                </CardTitle>
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                  <Link href="/lab/runs">Ver todas las corridas &rarr;</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {activeRuns.length === 0 ? (
                <div className="text-center py-6">
                  <FlaskConical className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                  <p className="text-xs text-muted-foreground italic">
                    No hay corridas acumulando actualmente. Abra una corrida semanal cuando inicie lote analítico.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeRuns.map((run) => (
                    <div
                      key={run.id}
                      className="p-3 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-indigo-600">
                            {run.code}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {run.labArea?.name || "Área General"}
                          </Badge>
                        </div>
                        <h4 className="font-bold text-sm text-foreground mt-0.5">
                          {run.labExam?.name}
                        </h4>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Semana: {new Date(run.weekStartDate).toLocaleDateString("es-ES")} al{" "}
                            {new Date(run.weekEndDate).toLocaleDateString("es-ES")}
                          </span>
                        </div>
                      </div>

                      <Button
                        asChild
                        size="sm"
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 shadow-xs"
                      >
                        <Link href={`/lab/runs/${run.id}/close`}>
                          Cerrar & Conciliar
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna Lateral: Alertas Críticas & Accesos Directos */}
        <div className="space-y-6">
          {/* Alertas Críticas de Reactivos FEFO */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Alertas FEFO de Insumos</span>
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                  {criticalUnits.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {criticalUnits.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                  <span>Todos los reactivos cuentan con saldo suficiente y vigencia técnica.</span>
                </div>
              ) : (
                criticalUnits.slice(0, 6).map((u) => {
                  const isExpired = u.expirationDate ? new Date(u.expirationDate) < new Date() : false;
                  const cur = Number(u.currentVolume ?? u.remainingUses ?? 0);
                  const init = Number(u.initialVolume ?? u.initialTheoreticalUses ?? 1);

                  return (
                    <div
                      key={String(u.id)}
                      className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground truncate max-w-[170px]">
                          {u.product?.name}
                        </span>
                        <span className="font-mono text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                          {cur} / {init} usos
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Código: {u.unitCode}</span>
                        {isExpired ? (
                          <Badge variant="destructive" className="text-[8px] py-0 px-1 font-bold">
                            VENCIDO
                          </Badge>
                        ) : (
                          <span>Vence: {u.expirationDate ? new Date(u.expirationDate).toLocaleDateString("es-ES") : "N/D"}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Accesos Rápidos del Módulo */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground">
                Módulos de Laboratorio Clínico
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              <Link
                href="/lab/runs"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 border border-border transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <FlaskConical className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-semibold block text-foreground">Corridas & Consumo</span>
                    <span className="text-[10px] text-muted-foreground">Cierre semanal y pruebas rápidas</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>

              <Link
                href="/lab/requests"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 border border-border transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="font-semibold block text-foreground">Solicitudes FEFO</span>
                    <span className="text-[10px] text-muted-foreground">Requisiciones en frío y despacho</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>

              <Link
                href="/lab/fridges"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 border border-border transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Snowflake className="w-4 h-4 text-cyan-600" />
                  <div>
                    <span className="font-semibold block text-foreground">Neveras & Cadena de Frío</span>
                    <span className="text-[10px] text-muted-foreground">Control térmico y arqueo 1-clic</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>

              <Link
                href="/lab/quality"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 border border-border transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <div>
                    <span className="font-semibold block text-foreground">Calidad & Cuarentena</span>
                    <span className="text-[10px] text-muted-foreground">Bloqueos técnicos y bitácora 5D</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
