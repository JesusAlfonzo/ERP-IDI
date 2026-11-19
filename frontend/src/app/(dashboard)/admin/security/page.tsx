"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import { RequestWindowAdminCard } from "@/components/requests/RequestWindowAdminCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  SlidersHorizontal,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";

export default function AdminRequestsSettingsPage() {
  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser(),
  );
  const isAdmin = currentUser?.roles.includes("ADMINISTRADOR") ?? false;

  if (!isAdmin) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-12">
        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-foreground">
              Acceso Restringido
            </h2>
            <p className="text-xs text-muted-foreground">
              Solo los administradores pueden cambiar estas opciones.
            </p>
            <Button asChild variant="default" size="sm" className="h-8 text-xs">
              <Link href="/dashboard">Ir al Panel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-12">
      {/* ========================================================
          ENCABEZADO ESTANDARIZADO
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Horario de Solicitudes
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Días, horas y límite de pedidos a almacén
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Link href="/requests">
              <ClipboardList className="w-3.5 h-3.5 text-primary" />
              Ver Solicitudes
            </Link>
          </Button>
        </div>
      </div>

      {/* ========================================================
          TARJETAS DE CONFIGURACIÓN DE SOLICITUDES
         ======================================================== */}
      <RequestWindowAdminCard />
    </div>
  );
}
