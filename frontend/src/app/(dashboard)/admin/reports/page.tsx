"use client";

import { useEffect, useState, useCallback } from "react";
import { FinancialReportsService } from "@/services/financial-reports.service";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import type {
  CostRealByExamReport,
  FinancialConsolidatedByAreaReport,
} from "@/types/financial-reports";
import type { LabArea, LabExam } from "@/types/lab-workflow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  FlaskConical,
  Activity,
  Calendar,
  Filter,
  RefreshCw,
  Building,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";

export default function AdminFinancialReportsPage() {
  const [activeTab, setActiveTab] = useState<"by-exam" | "by-area">("by-exam");

  // Filtros
  const [areas, setAreas] = useState<LabArea[]>([]);
  const [exams, setExams] = useState<LabExam[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("ALL");
  const [selectedExamId, setSelectedExamId] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Report Data
  const [byExamReport, setByExamReport] = useState<CostRealByExamReport | null>(null);
  const [byAreaReport, setByAreaReport] = useState<FinancialConsolidatedByAreaReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar metadatos de filtros
  useEffect(() => {
    async function loadMeta() {
      try {
        const [areasData, examsData] = await Promise.all([
          LabWorkflowService.getLabAreas(),
          LabWorkflowService.getLabExams(),
        ]);
        setAreas(areasData);
        setExams(examsData);
      } catch (err) {
        console.error("Error al cargar metadatos de filtros:", err);
      }
    }
    void loadMeta();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const areaFilter = selectedAreaId !== "ALL" ? Number(selectedAreaId) : undefined;
      const examFilter = selectedExamId !== "ALL" ? Number(selectedExamId) : undefined;

      if (activeTab === "by-exam") {
        const data = await FinancialReportsService.getCostRealByExam({
          labAreaId: areaFilter,
          examId: examFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        setByExamReport(data);
      } else {
        const data = await FinancialReportsService.getFinancialConsolidatedByArea({
          labAreaId: areaFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        setByAreaReport(data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al cargar reporte financiero";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedAreaId, selectedExamId, startDate, endDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const formatCurrency = (val: number | string | undefined | null) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Filter className="w-3.5 h-3.5 text-primary" />
              <span>Parámetros de Filtrado</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadData()}
              disabled={loading}
              className="h-7 text-xs gap-1.5"
            >
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Área de Laboratorio
              </label>
              <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                <SelectTrigger className="w-full text-xs h-9">
                  <SelectValue placeholder="Todas las áreas" />
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

            {activeTab === "by-exam" && (
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Examen de Catálogo
                </label>
                <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                  <SelectTrigger className="w-full text-xs h-9">
                    <SelectValue placeholder="Todos los exámenes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los exámenes</SelectItem>
                    {exams
                      .filter((e) => selectedAreaId === "ALL" || String(e.areaId) === selectedAreaId)
                      .map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.code} - {e.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Fecha Desde
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Fecha Hasta
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Error en el reporte</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs Principales */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "by-exam" | "by-area")}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 max-w-md mb-4">
          <TabsTrigger value="by-exam" className="text-xs">
            Costo Real por Examen
          </TabsTrigger>
          <TabsTrigger value="by-area" className="text-xs">
            Consolidado por Área
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: COSTO REAL POR EXAMEN */}
        <TabsContent value="by-exam" className="space-y-6">
          {byExamReport && (
            <>
              {/* Tarjetas KPI Resumen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <Card className="border border-border/80 shadow-xs">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                      <span>Exámenes Evaluados</span>
                      <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-xl font-bold text-foreground">
                      {byExamReport.summary.totalExamsAnalyzed}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 shadow-xs">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                      <span>Corridas Clínicas</span>
                      <Activity className="w-3.5 h-3.5 text-indigo-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-xl font-bold text-foreground">
                      {byExamReport.summary.totalWeeklyRuns}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 shadow-xs">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                      <span>Pruebas Válidas Paciente</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-xl font-bold text-foreground">
                      {byExamReport.summary.grandTotalPatientExams}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 shadow-xs">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                      <span>Gasto Total Acumulado</span>
                      <DollarSign className="w-3.5 h-3.5 text-rose-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-xl font-bold text-foreground">
                      {formatCurrency(byExamReport.summary.grandTotalCost)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 shadow-xs bg-primary/5">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-[11px] font-medium text-primary flex items-center justify-between">
                      <span>Costo Promedio / Examen</span>
                      <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-xl font-bold text-primary">
                      {formatCurrency(byExamReport.summary.averageCostPerExam)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabla Detallada de Exámenes */}
              <Card className="border border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-primary" />
                    <span>Desglose Analítico y Costo Efectivo por Examen Clínico</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Incluye doble absorción de costo de calibrador, controles y repeticiones justificadas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="text-xs">
                          <TableHead className="w-[120px]">Código</TableHead>
                          <TableHead>Nombre del Examen</TableHead>
                          <TableHead>Área</TableHead>
                          <TableHead className="text-right">Corridas</TableHead>
                          <TableHead className="text-right">Pruebas Válidas</TableHead>
                          <TableHead className="text-center">Desglose de Usos</TableHead>
                          <TableHead className="text-right">Costo Total ($)</TableHead>
                          <TableHead className="text-right font-bold text-primary">
                            Costo Efectivo ($)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        {byExamReport.byExam.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              No hay corridas cerradas reconciliadas con los filtros seleccionados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          byExamReport.byExam.map((exam) => (
                            <TableRow key={exam.examId} className="hover:bg-muted/30">
                              <TableCell className="font-mono font-bold text-foreground">
                                {exam.examCode}
                              </TableCell>
                              <TableCell className="font-medium text-foreground">
                                {exam.examName}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] font-normal">
                                  {exam.areaName}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{exam.totalRuns}</TableCell>
                              <TableCell className="text-right font-semibold text-foreground">
                                {exam.totalValidPatientExams}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1.5 flex-wrap text-[10px]">
                                  <span
                                    title="Pacientes"
                                    className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 rounded font-mono"
                                  >
                                    P: {exam.usesBreakdown.patientUses}
                                  </span>
                                  <span
                                    title="Repeticiones"
                                    className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono"
                                  >
                                    R: {exam.usesBreakdown.repeatUses}
                                  </span>
                                  <span
                                    title="Calibradores"
                                    className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono"
                                  >
                                    Cal: {exam.usesBreakdown.calibratorUses}
                                  </span>
                                  <span
                                    title="Controles"
                                    className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 px-1.5 py-0.5 rounded font-mono"
                                  >
                                    Ctrl: {exam.usesBreakdown.controlUses}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(exam.totalRunCost)}
                              </TableCell>
                              <TableCell className="text-right font-bold text-primary text-sm">
                                {formatCurrency(exam.effectiveCostPerExam)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB 2: CONSOLIDADO POR ÁREA */}
        <TabsContent value="by-area" className="space-y-6">
          {byAreaReport && (
            <>
              {/* Tarjetas KPI Consolidado Global */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border border-border/80 shadow-xs">
                  <CardHeader className="p-4 pb-1">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span>Gasto Operativo Clínico</span>
                      <FlaskConical className="w-4 h-4 text-emerald-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrency(byAreaReport.overallClinicalExpenditure)}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Corridas semanales de pacientes
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 shadow-xs">
                  <CardHeader className="p-4 pb-1">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span>Gasto Investigación & Docencia</span>
                      <Activity className="w-4 h-4 text-indigo-600" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrency(byAreaReport.overallResearchExpenditure)}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Ensayos experimentales y proyectos
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-primary/40 shadow-xs bg-primary/5">
                  <CardHeader className="p-4 pb-1">
                    <CardTitle className="text-xs font-semibold text-primary flex items-center justify-between">
                      <span>Gasto Combinado Consolidado</span>
                      <DollarSign className="w-4 h-4 text-primary" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(byAreaReport.grandTotalCombinedCost)}
                    </div>
                    <p className="text-[11px] text-primary/80 mt-0.5">
                      Total directo absorbido por la institución
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabla por Área */}
              <Card className="border border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building className="w-4 h-4 text-primary" />
                    <span>Consolidación Financiera por Áreas de Laboratorio</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="text-xs">
                          <TableHead>Área Operativa</TableHead>
                          <TableHead className="text-right">Corridas</TableHead>
                          <TableHead className="text-right">Exámenes Pacientes</TableHead>
                          <TableHead className="text-right">Gasto Clínico ($)</TableHead>
                          <TableHead className="text-right">Gasto Investigación ($)</TableHead>
                          <TableHead className="text-right font-bold text-foreground">
                            Costo Total Área ($)
                          </TableHead>
                          <TableHead className="text-right font-bold text-primary">
                            Costo Promedio / Examen
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        {byAreaReport.areas.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No se encontraron registros de áreas con los filtros dados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          byAreaReport.areas.map((area) => (
                            <TableRow key={area.areaId} className="hover:bg-muted/30">
                              <TableCell className="font-semibold text-foreground">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-muted-foreground text-[10px]">
                                    [{area.areaCode}]
                                  </span>
                                  <span>{area.areaName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{area.totalRuns}</TableCell>
                              <TableCell className="text-right">{area.totalPatientExams}</TableCell>
                              <TableCell className="text-right text-emerald-700 dark:text-emerald-400 font-mono">
                                {formatCurrency(area.clinicalCost)}
                              </TableCell>
                              <TableCell className="text-right text-indigo-700 dark:text-indigo-400 font-mono">
                                {formatCurrency(area.researchCost)}
                              </TableCell>
                              <TableCell className="text-right font-bold text-foreground font-mono">
                                {formatCurrency(area.totalAreaCost)}
                              </TableCell>
                              <TableCell className="text-right font-bold text-primary font-mono text-sm">
                                {formatCurrency(area.costPerExamAverage)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
