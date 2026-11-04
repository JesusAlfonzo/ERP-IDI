"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import type { LabArea, LabWeeklyRun } from "@/types/lab-workflow";
import type { LabFridge, LabReagentUnitItem } from "@/types/laboratory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  PlusCircle,
  RefreshCw,
  Building,
  Thermometer,
  Layers,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LabDashboardPage() {
  const [userAreas, setUserAreas] = useState<LabArea[]>([]);
  const [fridges, setFridges] = useState<LabFridge[]>([]);
  const [units, setUnits] = useState<LabReagentUnitItem[]>([]);
  const [activeRuns, setActiveRuns] = useState<LabWeeklyRun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [areasData, fridgesData, unitsData, runsData] = await Promise.all([
        LabWorkflowService.getMyLabAreas(),
        LabWorkflowService.getFridges(),
        LabWorkflowService.getLabUnits(),
        LabWorkflowService.getWeeklyRuns({ status: "IN_PROGRESS" }),
      ]);
      setUserAreas(areasData);
      setFridges(fridgesData);
      setUnits(unitsData);
      setActiveRuns(runsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar dashboard de laboratorio";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Alertas de frascos críticos (volumen bajo o por expirar)
  const criticalUnits = units.filter((u) => {
    const isLow = Number(u.currentVolume) <= Number(u.initialVolume) * 0.2;
    const isExpiring = u.expirationDate
      ? new Date(u.expirationDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
      : false;
    return (u.status === "EN_USO" || u.status === "SELLADO") && (isLow || isExpiring);
  });

  return (
    <div className="space-y-6">
      {/* Acciones Rápidas Superiores */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Estado Operativo del Área & Neveras
          </h2>
          <p className="text-xs text-muted-foreground">
            Monitor en tiempo real de cadena de frío, reactivos en uso y corridas clínicas en proceso.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
          <Button asChild size="sm" className="text-xs gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href="/lab/runs">
              <FlaskConical className="w-3.5 h-3.5" />
              Nueva Corrida Semanal
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="text-xs gap-1.5 h-9">
            <Link href="/lab/requests">
              <ClipboardList className="w-3.5 h-3.5" />
              Solicitar Reactivos
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tarjetas KPI de Operación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Neveras / Cavas</span>
              <Snowflake className="w-4 h-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-foreground">{fridges.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {fridges.filter((f) => f.status === "OPERATIVO").length} operativas
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Frascos en Uso</span>
              <FlaskConical className="w-4 h-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-foreground">
              {units.filter((u) => u.status === "EN_USO").length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              +{units.filter((u) => u.status === "SELLADO").length} sellados en reserva
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Corridas en Progreso</span>
              <Activity className="w-4 h-4 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-indigo-600">{activeRuns.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Listas para conciliación y cierre
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Alertas Críticas</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-amber-600">{criticalUnits.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Frascos con stock bajo o por vencer
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monitor de Neveras */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Snowflake className="w-4 h-4 text-blue-600" />
                <span>Monitoreo de Neveras de Cadena de Frío</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fridges.map((f) => {
                  const fridgeUnits = units.filter((u) => u.fridgeId === f.id);
                  return (
                    <div
                      key={f.id}
                      className="p-3.5 rounded-xl border border-border bg-card shadow-xs hover:border-blue-300 dark:hover:border-blue-800 transition-all space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-muted px-1.5 py-0.5 rounded text-foreground">
                            {f.code}
                          </span>
                          <span className="font-semibold text-sm text-foreground">
                            {f.name}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            f.status === "OPERATIVO"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]"
                              : "bg-rose-50 text-rose-700 border-rose-300 text-[10px]"
                          }
                        >
                          {f.status}
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
                        <div className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{fridgeUnits.length} frascos</span>
                        </div>
                      </div>

                      <div className="pt-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                          <span>Ocupación estimada</span>
                          <span className="font-mono">{Math.min(fridgeUnits.length * 10, 100)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(fridgeUnits.length * 10, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Corridas Semanales Activas */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <span>Corridas Semanales en Curso ({activeRuns.length})</span>
                </CardTitle>
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                  <Link href="/lab/runs">Ver todas las corridas &rarr;</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {activeRuns.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 italic">
                  No hay corridas semanales activas en este momento. Haz clic en &quot;Nueva Corrida Semanal&quot; para iniciar.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeRuns.map((run) => (
                    <div
                      key={run.id}
                      className="p-3 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-indigo-600">
                            {run.code}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {run.labArea?.name}
                          </Badge>
                        </div>
                        <h4 className="font-bold text-sm text-foreground mt-0.5">
                          {run.labExam?.name}
                        </h4>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Semana: {new Date(run.weekStartDate).toLocaleDateString()} al{" "}
                            {new Date(run.weekEndDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <Button
                        asChild
                        size="sm"
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
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

        {/* Panel Lateral: Alertas Críticas de Reactivos */}
        <div className="space-y-4">
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Alertas de Insumos Críticos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {criticalUnits.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                  <span>Todos los reactivos se encuentran dentro de niveles y vigencia seguros.</span>
                </div>
              ) : (
                criticalUnits.slice(0, 6).map((u) => (
                  <div
                    key={String(u.id)}
                    className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground truncate max-w-[170px]">
                        {u.product.name}
                      </span>
                      <span className="font-mono text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                        {u.currentVolume} / {u.initialVolume} usos
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Frasco: {u.unitCode}</span>
                      <span>Lote: {u.batch?.lotNumber}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
