"use client";

import { useState } from "react";
import { FinancialReportsService } from "@/services/financial-reports.service";
import type { ItemTraceabilityReport, TraceabilityBatch } from "@/types/financial-reports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  GitCommit,
  Package,
  Snowflake,
  FlaskConical,
  ShoppingCart,
  ShieldAlert,
  Microscope,
  Calendar,
  AlertCircle,
  Building,
  RefreshCw,
  FileText,
} from "lucide-react";

export default function TraceabilityReportPage() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [report, setReport] = useState<ItemTraceabilityReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // Si el término es puramente numérico, enviamos tanto batchId como lotNumber para búsqueda amplia
      const isNum = /^\d+$/.test(searchTerm.trim());
      const data = await FinancialReportsService.getItemTraceability({
        lotNumber: searchTerm.trim(),
        batchId: isNum ? searchTerm.trim() : undefined,
      });
      setReport(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al buscar trazabilidad de lote";
      setError(msg);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number | string | undefined | null) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Buscador de Trazabilidad */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="py-4 px-5 bg-muted/20 border-b border-border/60">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            <span>Rastreo Punta a Punta por Lote o Producto</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Ingresa el número de lote (ej. LOTE-2026-X, BIO-LOT-01) o identificador para reconstruir su ciclo de vida completo.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
            <div className="relative flex-1">
              <GitCommit className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Ejemplo: LOT-HEMA-2026-A1, REAG-9982, etc."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 text-xs font-mono"
              />
            </div>
            <Button type="submit" disabled={loading || !searchTerm.trim()} className="gap-2 text-xs">
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              Rastrear Lote
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Búsqueda no encontrada</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {hasSearched && !loading && report && report.batches.length === 0 && (
        <Card className="p-8 text-center border-dashed">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
          <h3 className="text-sm font-semibold text-foreground">
            No se encontraron lotes para &quot;{searchTerm}&quot;
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Verifica que el número de lote coincida exactamente con los registros de inventario o recepción.
          </p>
        </Card>
      )}

      {/* Resultados de Lotes encontrados */}
      {report && report.batches.length > 0 && (
        <div className="space-y-8">
          {report.batches.map((batch: TraceabilityBatch) => (
            <Card key={String(batch.id)} className="border border-border/80 shadow-sm overflow-hidden">
              {/* Cabecera del Lote */}
              <div className="p-5 bg-gradient-to-r from-muted/60 via-muted/30 to-background border-b border-border/70">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        LOTE: {batch.lotNumber}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          batch.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {batch.status}
                      </Badge>
                    </div>
                    <h2 className="text-lg font-bold text-foreground mt-1">
                      {batch.product.name}
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono">
                      SKU: {batch.product.sku} &bull; Cat: {batch.product.category?.name || "N/A"} &bull; Marca: {batch.product.brand?.name || "Genérico"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-background/80 p-3 rounded-xl border border-border/80">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block">Stock Actual</span>
                      <span className="font-bold text-foreground font-mono">
                        {batch.currentQuantity} / {batch.initialQuantity}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block">Costo Unitario</span>
                      <span className="font-bold text-foreground font-mono">
                        {formatCurrency(batch.costPerUnit)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block">Vencimiento</span>
                      <span className="font-bold text-foreground font-mono">
                        {batch.expirationDate ? new Date(batch.expirationDate).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block">Ubicación</span>
                      <span className="font-bold text-foreground truncate block">
                        {batch.location?.name || "Almacén Central"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenido: Timeline / Pasos del Lote */}
              <CardContent className="p-6 space-y-6">
                {/* 1. Origen y Compra */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                    <span>1. Origen y Adquisición en Almacén</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/20 p-3 rounded-lg border border-border/60 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Proveedor:</span>
                      <span className="font-medium text-foreground">
                        {batch.origin?.supplierName || "No registrado / Donación"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Orden de Compra / Entrada:</span>
                      <span className="font-mono font-medium text-foreground">
                        {batch.origin?.orderNumber || "Entrada Directa / Donación"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Recepción & Almacenista:</span>
                      <span className="font-medium text-foreground">
                        {batch.origin?.receivedBy || "Almacén Central"}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 2. Unidades Físicas / Frascos en Laboratorio */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <Snowflake className="w-4 h-4 text-emerald-600" />
                    <span>2. Frascos Físicos en Neveras ({batch.labUnits.length} Unidades)</span>
                  </h4>

                  {batch.labUnits.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic bg-muted/10 p-3 rounded border">
                      Este lote aún no ha sido fraccionado o despachado a neveras de laboratorio.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border rounded-lg">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow className="text-xs">
                            <TableHead>Código Frasco</TableHead>
                            <TableHead>Nevera Asignada</TableHead>
                            <TableHead>Área Operativa</TableHead>
                            <TableHead>Estado Actual</TableHead>
                            <TableHead className="text-right">Volumen / Usos</TableHead>
                            <TableHead>Corridas Clínicas Asociadas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          {batch.labUnits.map((u) => (
                            <TableRow key={String(u.id)}>
                              <TableCell className="font-mono font-bold text-foreground">
                                {u.unitCode}
                              </TableCell>
                              <TableCell>{u.fridgeName || "Sin nevera"}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">
                                  {u.areaName || "Almacén / Cuarentena"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    u.status === "EN_USO"
                                      ? "bg-blue-600"
                                      : u.status === "SELLADO"
                                      ? "bg-emerald-600"
                                      : "bg-muted text-muted-foreground"
                                  }
                                >
                                  {u.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">
                                {u.currentVolume} / {u.initialVolume}
                              </TableCell>
                              <TableCell>
                                {u.runConsumptions && u.runConsumptions.length > 0 ? (
                                  <div className="space-y-1">
                                    {u.runConsumptions.map((run, idx) => (
                                      <div
                                        key={idx}
                                        className="text-[11px] bg-muted/40 p-1 rounded font-mono text-muted-foreground flex items-center justify-between"
                                      >
                                        <span>{run.runCode} ({run.examName})</span>
                                        <span className="font-bold text-foreground">{run.uses} usos</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-[11px] italic">Sin consumos aún</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
