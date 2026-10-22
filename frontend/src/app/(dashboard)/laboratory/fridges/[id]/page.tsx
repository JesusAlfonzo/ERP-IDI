"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { LabFridgeService } from "@/services/lab-fridge.service";
import { AuthService } from "@/services/auth.service";
import type {
  FridgeContentsResponse,
  ReagentInFridge,
} from "@/types/laboratory";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Snowflake,
  ArrowLeft,
  Thermometer,
  Building,
  Package,
  Layers,
  Trash2,
  AlertCircle,
  Printer,
  Loader2,
} from "lucide-react";

export default function FridgeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const fridgeId = params?.id as string;

  const [currentUser] = useState(() => AuthService.getCurrentUser());
  const userRoles = currentUser?.roles || [];
  const isLabStaff =
    userRoles.includes("ADMINISTRADOR") ||
    userRoles.includes("LABORATORIO");

  const [fridge, setFridge] = useState<FridgeContentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const loadFridge = useCallback(async () => {
    if (!fridgeId) return;
    try {
      const data = await LabFridgeService.getFridgeContents(Number(fridgeId));
      setFridge(data);
    } catch (err) {
      console.error("Error cargando inventario de nevera", err);
    } finally {
      setLoading(false);
    }
  }, [fridgeId]);

  useEffect(() => {
    startTransition(() => {
      void loadFridge();
    });
  }, [loadFridge]);

  const handleOpenUnit = async (unitId: string | number) => {
    if (!isLabStaff) return;
    try {
      await LabFridgeService.openUnit(unitId);
      await loadFridge();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al abrir reactivo");
    }
  };

  const handleDiscardUnit = async (unit: ReagentInFridge) => {
    if (!isLabStaff) return;
    const reason = prompt(
      `Motivo de descarte de ${unit.product?.name ?? "reactivo"} (${unit.unitCode}):`,
    );
    if (!reason || !reason.trim()) return;

    try {
      await LabFridgeService.discardUnit(unit.id, reason.trim());
      await loadFridge();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al descartar");
    }
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-2" />
        <span className="text-xs text-muted-foreground font-medium">
          Auditando existencias en frío...
        </span>
      </div>
    );
  }

  if (!fridge) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <Card className="shadow-xs p-6 space-y-4">
          <CardContent className="space-y-4 p-0">
            <h2 className="text-lg font-bold text-slate-800">
              Equipo de refrigeración no encontrado
            </h2>
            <Button
              type="button"
              size="sm"
              onClick={() => router.push("/laboratory/fridges")}
              className="gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a equipos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const units = fridge.labReagentUnits || [];
  const sealedCount = units.filter((u) => u.status === "SELLADO").length;
  const inUseCount = units.filter((u) => u.status === "EN_USO").length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => router.push("/laboratory/fridges")}
            className="cursor-pointer"
            title="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs font-bold bg-sky-50 text-sky-700 border-sky-200">
                {fridge.code}
              </Badge>
              <Badge variant="outline" className="text-[11px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                Inventario Operativo
              </Badge>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-sky-600" />
              {fridge.name}
            </h1>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="gap-1.5 cursor-pointer shadow-xs"
        >
          <Printer className="w-3.5 h-3.5" /> Imprimir Inventario Físico
        </Button>
      </div>

      {!isLabStaff && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs text-muted-foreground">
            Modo de consulta (solo lectura): La apertura o descarte de frascos analíticos requiere privilegios de <strong>Laboratorio Clínico</strong> o <strong>Administración</strong>.
          </AlertDescription>
        </Alert>
      )}

      {/* Resumen de Capacidad y Estado */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-sky-600" />
              Consigna Térmica
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {fridge.targetTempCelsius !== null &&
              fridge.targetTempCelsius !== undefined
                ? `${Number(fridge.targetTempCelsius)}°C`
                : "Ambiente"}
            </div>
            <span className="text-[10px] text-muted-foreground">
              Temperatura controlada
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Building className="w-4 h-4 text-purple-600" />
              Ubicación
            </div>
            <div className="text-sm font-bold text-slate-800 truncate">
              {fridge.location?.name ?? "Laboratorio"}
            </div>
            <span className="text-[10px] text-muted-foreground">Sala técnica</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              Frascos Sellados
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-700">
              {sealedCount}
            </div>
            <span className="text-[10px] text-muted-foreground">Stock de reserva</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Package className="w-4 h-4 text-amber-600" />
              Frascos En Uso
            </div>
            <div className="text-2xl font-bold font-mono text-amber-700">
              {inUseCount}
            </div>
            <span className="text-[10px] text-muted-foreground">
              En banco de trabajo
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Frascos / Reactivos en Frío */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="p-4 bg-muted/20 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Package className="w-4 h-4 text-sky-600" />
            Frascos y Lotes Almacenados en el Equipo ({units.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="py-3 px-4 font-semibold">Código Frasco</TableHead>
                <TableHead className="py-3 px-4 font-semibold">Reactivo / Insumo</TableHead>
                <TableHead className="py-3 px-4 font-semibold">Lote</TableHead>
                <TableHead className="py-3 px-4 text-center font-semibold">Estado</TableHead>
                <TableHead className="py-3 px-4 text-right font-semibold">Volumen</TableHead>
                <TableHead className="py-3 px-4 font-semibold">Caducidad</TableHead>
                <TableHead className="py-3 px-4 text-center font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No se registran reactivos en esta nevera. Use el botón
                    &quot;Asignar lote&quot; en Consumo o traslade frascos desde
                    otra cava.
                  </TableCell>
                </TableRow>
              ) : (
                units.map((unit) => (
                  <TableRow key={String(unit.id)} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="py-3 px-4 font-mono font-bold text-slate-800">
                      {unit.unitCode}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {unit.product?.name}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        SKU: {unit.product?.sku}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 font-mono text-purple-700 font-bold">
                      #{unit.batch?.lotNumber ?? "N/D"}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <Badge
                        variant="outline"
                        className={
                          unit.status === "SELLADO"
                            ? "bg-muted text-muted-foreground border-border"
                            : unit.status === "EN_USO"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        {unit.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {Number(unit.currentVolume)} /{" "}
                      {Number(unit.initialVolume)}{" "}
                      {unit.product?.baseUnit?.abbreviation ?? "ml"}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-mono text-muted-foreground">
                      {unit.expirationDate
                        ? new Date(unit.expirationDate).toLocaleDateString()
                        : "N/D"}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center space-x-2">
                      {isLabStaff ? (
                        <>
                          {unit.status === "SELLADO" && (
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={() => handleOpenUnit(unit.id)}
                              className="text-xs text-sky-600 hover:text-sky-800 font-semibold cursor-pointer p-0 h-auto"
                            >
                              Abrir
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDiscardUnit(unit)}
                            className="text-muted-foreground hover:text-destructive cursor-pointer h-7 w-7"
                            title="Descartar frasco"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">
                          Solo lectura
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
