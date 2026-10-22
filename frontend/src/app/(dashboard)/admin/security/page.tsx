"use client";

import { useState } from "react";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import { RequestWindowAdminCard } from "@/components/requests/RequestWindowAdminCard";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Lock,
  Users,
  AlertTriangle,
  Building,
  KeyRound,
} from "lucide-react";
import Link from "next/link";

export default function AdminSecurityPage() {
  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );
  const isAdmin = currentUser?.roles.includes("ADMINISTRADOR") ?? false;

  if (!isAdmin) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <Card className="border-destructive/20 shadow-xs">
          <CardContent className="pt-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Acceso Restringido</h2>
            <p className="text-xs text-muted-foreground">
              Esta sección está reservada exclusivamente para el personal con rol de
              Administrador del sistema.
            </p>
            <Button asChild variant="default" size="sm">
              <Link href="/dashboard">Volver al Inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-primary" />
            Seguridad & Políticas Institucionales
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Administración centralizada de ventanas operativas, control de
            acceso y directrices del IDI
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="shadow-xs">
            <Link href="/admin/users">
              <Users className="w-4 h-4 mr-1.5 text-muted-foreground" />
              Gestión de Usuarios & Roles
            </Link>
          </Button>
        </div>
      </div>

      {/* Tarjeta de Ventana Operativa de Requisiciones */}
      <RequestWindowAdminCard />

      {/* Información de Directrices de Seguridad y Control */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              Control de Acceso RBAC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Las políticas de seguridad restringen las acciones de aprobación y
              despacho exclusivamente a usuarios con roles{" "}
              <strong className="text-foreground">ADMINISTRADOR</strong> o{" "}
              <strong className="text-foreground">ALMACENISTA</strong>.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              Auditoría de Kardex Físico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Todo despacho genera correlativos inmutables y trazabilidad
              completa vinculando el usuario que autorizó y el número de lote
              afectado.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Building className="w-4 h-4 text-purple-600" />
              Regla de Ventana Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              La ventana operativa previene la saturación del almacén central,
              concentrando las solicitudes regulares en los primeros días hábiles
              de cada semana.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
