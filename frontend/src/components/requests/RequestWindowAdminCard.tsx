"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { RequestClientService } from "@/services/request.service";
import { AuthService } from "@/services/auth.service";
import type { RequestWindowConfigData } from "@/types/requests";
import type { AuthUser } from "@/types/auth";
import { cn } from "@/lib/utils";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/utils/toast";
import {
  Clock,
  ShieldAlert,
  Loader2,
  Save,
  Calendar,
  Unlock,
  Hash,
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
    AuthService.getCurrentUser(),
  );
  const isAdmin = currentUser?.roles.includes("ADMINISTRADOR") ?? false;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estado de configuración
  const [startDay, setStartDay] = useState(1); // Lunes
  const [startTime, setStartTime] = useState("05:00");
  const [endDay, setEndDay] = useState(3); // Miércoles
  const [endTime, setEndTime] = useState("16:00");
  const [isFreeMode, setIsFreeMode] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [maxWeeklyRequests, setMaxWeeklyRequests] = useState(1);

  const [, startTransition] = useTransition();

  const loadConfig = useCallback(async () => {
    try {
      const config = await RequestClientService.getWindowConfig();
      if (config) {
        const pad = (n: number) => String(n).padStart(2, "0");
        setStartDay(config.startDay);
        setStartTime(`${pad(config.startHour)}:${pad(config.startMinute)}`);
        setEndDay(config.endDay);
        setEndTime(`${pad(config.endHour)}:${pad(config.endMinute)}`);
        setIsSuspended(Boolean(config.isSuspended));
        setMaxWeeklyRequests(config.maxWeeklyRequestsPerUser ?? 1);

        // Detectar Modo Libre (Domingo 00:00 a Sábado 23:59)
        const isFullWeek =
          config.startDay === 0 &&
          config.startHour === 0 &&
          config.startMinute === 0 &&
          config.endDay === 6 &&
          config.endHour === 23 &&
          config.endMinute === 59;
        setIsFreeMode(isFullWeek);
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Error al cargar la configuración",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    startTransition(() => {
      void loadConfig();
    });
  }, [isAdmin, loadConfig]);

  if (!isAdmin) {
    return null;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let payload: Partial<RequestWindowConfigData>;

      if (isFreeMode) {
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
      toast.success("Configuración guardada");

      if (onConfigUpdated) {
        onConfigUpdated();
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Error al guardar la configuración",
      );
    } finally {
      setSaving(false);
    }
  };

  const startDayLabel =
    DAYS_OF_WEEK.find((d) => d.value === startDay)?.label || "Lunes";
  const endDayLabel =
    DAYS_OF_WEEK.find((d) => d.value === endDay)?.label || "Miércoles";

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-2 bg-card border border-border/80 rounded-2xl shadow-2xs">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">
          Cargando opciones...
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className={cn("space-y-6", className)}>
      {/* ========================================================
          TARJETAS ESPECÍFICAS POR CADA OPCIÓN DE CONFIGURACIÓN
         ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Horario Libre */}
        <Card
          onClick={() => setIsFreeMode(!isFreeMode)}
          className={cn(
            "border-border/80 shadow-2xs transition-all cursor-pointer overflow-hidden",
            isFreeMode
              ? "border-purple-400 dark:border-purple-600 bg-purple-500/5"
              : "hover:border-border",
          )}
        >
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Unlock className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Horario Libre
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Recepción abierta las 24 horas
                  </p>
                </div>
              </div>
              <Checkbox
                id="freeMode"
                checked={isFreeMode}
                onCheckedChange={(checked) => setIsFreeMode(Boolean(checked))}
                onClick={(e) => e.stopPropagation()}
                className="mt-1"
              />
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/50">
              Permite que los usuarios envíen solicitudes cualquier día de la
              semana sin límite de hora.
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Pausar Solicitudes */}
        <Card
          onClick={() => setIsSuspended(!isSuspended)}
          className={cn(
            "border-border/80 shadow-2xs transition-all cursor-pointer overflow-hidden",
            isSuspended
              ? "border-rose-400 dark:border-rose-600 bg-rose-500/5"
              : "hover:border-border",
          )}
        >
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Pausar Solicitudes
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Bloqueo temporal de pedidos
                  </p>
                </div>
              </div>
              <Checkbox
                id="suspended"
                checked={isSuspended}
                onCheckedChange={(checked) => setIsSuspended(Boolean(checked))}
                onClick={(e) => e.stopPropagation()}
                className="mt-1"
              />
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/50">
              Detiene el envío de nuevas solicitudes mientras se realiza conteo o
              cierre de almacén.
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Apertura Semanal */}
        <Card
          className={cn(
            "border-border/80 shadow-2xs transition-opacity overflow-hidden",
            isFreeMode && "opacity-45 pointer-events-none",
          )}
        >
          <CardContent className="p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Apertura Semanal
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Inicio de recepción de pedidos
                  </p>
                </div>
              </div>
              <Badge variant="success" className="text-[10px] font-mono">
                {startDayLabel} {startTime}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
              <div className="space-y-1.5">
                <Label className="block text-xs font-bold text-foreground">
                  Día
                </Label>
                <select
                  value={startDay}
                  disabled={isFreeMode}
                  onChange={(e) => setStartDay(Number(e.target.value))}
                  className="w-full h-9 bg-card border border-border/80 rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="block text-xs font-bold text-foreground">
                  Hora
                </Label>
                <Input
                  type="time"
                  value={startTime}
                  disabled={isFreeMode}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-9 text-xs font-mono bg-card border-border/80 rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Cierre Semanal */}
        <Card
          className={cn(
            "border-border/80 shadow-2xs transition-opacity overflow-hidden",
            isFreeMode && "opacity-45 pointer-events-none",
          )}
        >
          <CardContent className="p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Cierre Semanal
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Fin de recepción de pedidos
                  </p>
                </div>
              </div>
              <Badge variant="warning" className="text-[10px] font-mono">
                {endDayLabel} {endTime}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
              <div className="space-y-1.5">
                <Label className="block text-xs font-bold text-foreground">
                  Día
                </Label>
                <select
                  value={endDay}
                  disabled={isFreeMode}
                  onChange={(e) => setEndDay(Number(e.target.value))}
                  className="w-full h-9 bg-card border border-border/80 rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="block text-xs font-bold text-foreground">
                  Hora
                </Label>
                <Input
                  type="time"
                  value={endTime}
                  disabled={isFreeMode}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-9 text-xs font-mono bg-card border-border/80 rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Cupo por Usuario (2 columnas en desktop) */}
        <Card className="md:col-span-2 border-border/80 shadow-2xs overflow-hidden">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Cupo Semanal por Usuario
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cantidad máxima de solicitudes que cada usuario puede crear por
                  semana
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="w-24">
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={maxWeeklyRequests}
                  onChange={(e) =>
                    setMaxWeeklyRequests(
                      Math.max(1, Number(e.target.value) || 1),
                    )
                  }
                  className="h-9 text-xs font-mono font-bold text-center bg-card border-border/80 rounded-xl"
                />
              </div>
              <Button
                type="submit"
                disabled={saving}
                size="sm"
                className="h-9 text-xs gap-1.5 px-4 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
