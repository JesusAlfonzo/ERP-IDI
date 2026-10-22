"use client";

import { useState, useEffect, useTransition } from "react";
import { RequestClientService } from "@/services/request.service";
import { AuthService } from "@/services/auth.service";
import type { RequestWindowConfigData } from "@/types/requests";
import type { AuthUser } from "@/types/auth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Sliders,
  Calendar,
  Lock,
  Unlock,
} from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

interface RequestWindowAdminCardProps {
  onConfigUpdated?: () => void;
  className?: string;
}

export function RequestWindowAdminCard({
  onConfigUpdated,
  className = "",
}: RequestWindowAdminCardProps) {
  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );
  const isAdmin = currentUser?.roles.includes("ADMINISTRADOR") ?? false;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  // Form State
  const [startDay, setStartDay] = useState(1); // Lunes
  const [startTime, setStartTime] = useState("05:00");
  const [endDay, setEndDay] = useState(3); // Miércoles
  const [endTime, setEndTime] = useState("16:00");
  const [isFreeMode, setIsFreeMode] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [maxWeeklyRequests, setMaxWeeklyRequests] = useState(1);

  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!isAdmin) return;

    let isMounted = true;
    startTransition(() => {
      void (async () => {
        try {
          const config = await RequestClientService.getWindowConfig();
          if (isMounted && config) {
            const pad = (n: number) => String(n).padStart(2, "0");
            setStartDay(config.startDay);
            setStartTime(
              `${pad(config.startHour)}:${pad(config.startMinute)}`
            );
            setEndDay(config.endDay);
            setEndTime(`${pad(config.endHour)}:${pad(config.endMinute)}`);
            setIsSuspended(Boolean(config.isSuspended));
            setMaxWeeklyRequests(config.maxWeeklyRequestsPerUser ?? 1);

            // Detectar Modo Libre (00:00 a 23:59 domingo a sábado)
            const isFullWeek =
              config.startDay === 0 &&
              config.startHour === 0 &&
              config.startMinute === 0 &&
              config.endDay === 6 &&
              config.endHour === 23 &&
              config.endMinute === 59;
            setIsFreeMode(isFullWeek);
            setLoading(false);
          }
        } catch (err: unknown) {
          if (isMounted) {
            setFeedback({
              status: "error",
              message:
                err instanceof Error
                  ? err.message
                  : "Error al cargar la configuración de la ventana",
            });
            setLoading(false);
          }
        }
      })();
    });

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return null;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      let payload: Partial<RequestWindowConfigData>;

      if (isFreeMode) {
        // Modo Libre: Apertura completa Domingo 00:00 a Sábado 23:59
        payload = {
          startDay: 0,
          startHour: 0,
          startMinute: 0,
          endDay: 6,
          endHour: 23,
          endMinute: 59,
          isSuspended,
          maxWeeklyRequestsPerUser: Number(maxWeeklyRequests) || 1,
        };
      } else {
        const [sHour, sMinute] = startTime.split(":").map(Number);
        const [eHour, eMinute] = endTime.split(":").map(Number);

        payload = {
          startDay,
          startHour: isNaN(sHour) ? 5 : sHour,
          startMinute: isNaN(sMinute) ? 0 : sMinute,
          endDay,
          endHour: isNaN(eHour) ? 16 : eHour,
          endMinute: isNaN(eMinute) ? 0 : eMinute,
          isSuspended,
          maxWeeklyRequestsPerUser: Number(maxWeeklyRequests) || 1,
        };
      }

      await RequestClientService.updateWindowConfig(payload);

      setFeedback({
        status: "success",
        message: "Configuración de ventana operativa guardada con éxito.",
      });

      if (onConfigUpdated) {
        onConfigUpdated();
      }
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al actualizar la configuración.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={`overflow-hidden shadow-xs ${className}`}>
      {/* Header */}
      <CardHeader className="bg-muted/30 border-b border-border pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                Gestión de Ventana Operativa de Requisiciones
                <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                  Solo Administrador
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Control institucional de días, horario y cupos para la recepción
                de solicitudes
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSuspended ? (
              <Badge variant="destructive" className="gap-1.5 py-1 text-xs">
                <ShieldAlert className="w-3.5 h-3.5" /> Suspendida
              </Badge>
            ) : isFreeMode ? (
              <Badge variant="outline" className="gap-1.5 py-1 text-xs bg-purple-50 text-purple-700 border-purple-200">
                <Unlock className="w-3.5 h-3.5" /> Modo Libre (24/7)
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5 py-1 text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                <Lock className="w-3.5 h-3.5" /> Ventana Activa
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {loading ? (
        <CardContent className="p-8 flex flex-col items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
          <span className="text-xs text-muted-foreground font-medium">
            Cargando configuración institucional...
          </span>
        </CardContent>
      ) : (
        <form onSubmit={handleSave}>
          <CardContent className="p-5 space-y-5">
            {feedback && (
              <Alert variant={feedback.status === "success" ? "default" : "destructive"}>
                {feedback.status === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription className="text-xs font-medium">
                  {feedback.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Opciones de Modo: Modo Libre vs Suspensión */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`p-4 rounded-xl border transition-all ${
                  isFreeMode
                    ? "bg-purple-50/60 border-purple-200"
                    : "bg-muted/40 border-border"
                }`}
              >
                <div className="flex items-start gap-3 cursor-pointer" onClick={() => setIsFreeMode(!isFreeMode)}>
                  <Checkbox
                    id="freeMode"
                    checked={isFreeMode}
                    onCheckedChange={(checked) => setIsFreeMode(Boolean(checked))}
                    className="mt-1 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                  />
                  <div>
                    <Label htmlFor="freeMode" className="text-xs font-bold text-foreground cursor-pointer block">
                      Desactivar restricción de horario (Modo Libre 24/7)
                    </Label>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Permite que los usuarios solicitantes creen requisiciones en
                      cualquier momento sin restricción de horario.
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border transition-all ${
                  isSuspended
                    ? "bg-destructive/10 border-destructive/30"
                    : "bg-muted/40 border-border"
                }`}
              >
                <div className="flex items-start gap-3 cursor-pointer" onClick={() => setIsSuspended(!isSuspended)}>
                  <Checkbox
                    id="suspended"
                    checked={isSuspended}
                    onCheckedChange={(checked) => setIsSuspended(Boolean(checked))}
                    className="mt-1 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                  />
                  <div>
                    <Label htmlFor="suspended" className="text-xs font-bold text-foreground cursor-pointer block">
                      Suspender recepción de solicitudes (Pausa administrativa)
                    </Label>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Bloquea temporalmente el registro de requisiciones para todos
                      los solicitantes por inventario o mantenimiento.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuración de Días y Horas (Solo activa si NO es Modo Libre) */}
            <div
              className={`space-y-4 transition-opacity ${
                isFreeMode ? "opacity-40 pointer-events-none" : "opacity-100"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                <Clock className="w-4 h-4 text-primary" />
                Horario Institucional de Apertura y Cierre
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Apertura */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Momento de Apertura Semanal
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="block text-[11px] text-muted-foreground font-semibold mb-1">
                        Día de Apertura
                      </Label>
                      <select
                        value={startDay}
                        disabled={isFreeMode}
                        onChange={(e) => setStartDay(Number(e.target.value))}
                        className="w-full bg-background border border-input rounded-md px-2.5 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-ring"
                      >
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="block text-[11px] text-muted-foreground font-semibold mb-1">
                        Hora de Apertura
                      </Label>
                      <Input
                        type="time"
                        value={startTime}
                        disabled={isFreeMode}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Por defecto institucional: <strong>Lunes a las 05:00 AM</strong>
                  </p>
                </div>

                {/* Cierre */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    Momento de Cierre Semanal
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="block text-[11px] text-muted-foreground font-semibold mb-1">
                        Día de Cierre
                      </Label>
                      <select
                        value={endDay}
                        disabled={isFreeMode}
                        onChange={(e) => setEndDay(Number(e.target.value))}
                        className="w-full bg-background border border-input rounded-md px-2.5 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-ring"
                      >
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="block text-[11px] text-muted-foreground font-semibold mb-1">
                        Hora de Cierre
                      </Label>
                      <Input
                        type="time"
                        value={endTime}
                        disabled={isFreeMode}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Por defecto institucional:{" "}
                    <strong>Miércoles a las 16:00 (04:00 PM)</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Límite de solicitudes por usuario por ciclo */}
            <div className="p-4 bg-muted/30 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Límite de solicitudes por usuario por ciclo
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  Número máximo de requisiciones que un solicitante puede ingresar
                  por cada semana operativa (por defecto: 1).
                </span>
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={maxWeeklyRequests}
                  onChange={(e) =>
                    setMaxWeeklyRequests(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="h-8 text-xs font-mono font-bold text-center"
                />
              </div>
            </div>
          </CardContent>

          {/* Botón de Guardar */}
          <CardFooter className="flex justify-end pt-3 pb-4 px-5 border-t border-border">
            <Button
              type="submit"
              disabled={saving}
              size="sm"
              className="gap-2 shadow-xs cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
