"use client";

import { useState, useEffect, useTransition } from "react";
import { RequestClientService } from "@/services/request.service";
import { AuthService } from "@/services/auth.service";
import type { RequestWindowConfigData } from "@/types/requests";
import type { AuthUser } from "@/types/auth";
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
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-100 bg-linear-to-r from-slate-50 to-blue-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Gestión de Ventana Operativa de Requisiciones
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Solo Administrador
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Control institucional de días, horario y cupos para la recepción
              de solicitudes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSuspended ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
              <ShieldAlert className="w-3.5 h-3.5" /> Suspendida
            </span>
          ) : isFreeMode ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <Unlock className="w-3.5 h-3.5" /> Modo Libre (24/7)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Lock className="w-3.5 h-3.5" /> Ventana Activa
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-8 flex flex-col items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
          <span className="text-xs text-slate-500 font-medium">
            Cargando configuración institucional...
          </span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="p-5 space-y-5">
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
                feedback.status === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {feedback.status === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          {/* Opciones de Modo: Modo Libre vs Ventana Semanal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`p-4 rounded-xl border transition-all ${
                isFreeMode
                  ? "bg-purple-50/60 border-purple-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFreeMode}
                  onChange={(e) => setIsFreeMode(e.target.checked)}
                  className="mt-1 w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Desactivar restricción de horario (Modo Libre 24/7)
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Permite que los usuarios solicitantes creen requisiciones en
                    cualquier momento sin restricción de horario.
                  </span>
                </div>
              </label>
            </div>

            <div
              className={`p-4 rounded-xl border transition-all ${
                isSuspended
                  ? "bg-red-50/70 border-red-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSuspended}
                  onChange={(e) => setIsSuspended(e.target.checked)}
                  className="mt-1 w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Suspender recepción de solicitudes (Pausa administrativa)
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Bloquea temporalmente el registro de requisiciones para todos
                    los solicitantes por inventario o mantenimiento.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Configuración de Días y Horas (Solo activa si NO es Modo Libre) */}
          <div
            className={`space-y-4 transition-opacity ${
              isFreeMode ? "opacity-40 pointer-events-none" : "opacity-100"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Clock className="w-4 h-4 text-blue-600" />
              Horario Institucional de Apertura y Cierre
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Apertura */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Momento de Apertura Semanal
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                      Día de Apertura
                    </label>
                    <select
                      value={startDay}
                      disabled={isFreeMode}
                      onChange={(e) => setStartDay(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                      Hora de Apertura
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      disabled={isFreeMode}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Por defecto institucional: <strong>Lunes a las 05:00 AM</strong>
                </p>
              </div>

              {/* Cierre */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  Momento de Cierre Semanal
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                      Día de Cierre
                    </label>
                    <select
                      value={endDay}
                      disabled={isFreeMode}
                      onChange={(e) => setEndDay(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                      Hora de Cierre
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      disabled={isFreeMode}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Por defecto institucional:{" "}
                  <strong>Miércoles a las 16:00 (04:00 PM)</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Límite de solicitudes por usuario por ciclo */}
          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Límite de solicitudes por usuario por ciclo
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Número máximo de requisiciones que un solicitante puede ingresar
                por cada semana operativa (por defecto: 1).
              </span>
            </div>
            <div className="w-32">
              <input
                type="number"
                min="1"
                max="20"
                value={maxWeeklyRequests}
                onChange={(e) =>
                  setMaxWeeklyRequests(Math.max(1, Number(e.target.value) || 1))
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800 text-center focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Botón de Guardar */}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Guardando..." : "Guardar Configuración"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
