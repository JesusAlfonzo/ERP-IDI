"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, Snowflake, ClipboardList, CheckCircle2, Building } from "lucide-react";
import { cn } from "@/lib/utils";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import type { LabArea } from "@/types/lab-workflow";
import { Badge } from "@/components/ui/badge";

export default function LabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [userAreas, setUserAreas] = useState<LabArea[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadAreas() {
      try {
        const areas = await LabWorkflowService.getMyLabAreas();
        if (isMounted) {
          setUserAreas(areas);
        }
      } catch (e) {
        console.error("Error al cargar áreas asignadas:", e);
      } finally {
        if (isMounted) setLoadingAreas(false);
      }
    }
    void loadAreas();
    return () => {
      isMounted = false;
    };
  }, []);

  const navLinks = [
    {
      label: "Dashboard de Neveras & Área",
      href: "/lab/dashboard",
      icon: Snowflake,
    },
    {
      label: "Mis Solicitudes de Insumos",
      href: "/lab/requests",
      icon: ClipboardList,
    },
    {
      label: "Corridas Semanales Clínicas",
      href: "/lab/runs",
      icon: FlaskConical,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
              <span>Área Operativa &bull; Laboratorio Clínico</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
              Operaciones de Laboratorio
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestión directa de reactivos en nevera, solicitudes internas y corridas semanales con doble descuento.
            </p>
          </div>

          {/* Áreas Asignadas al Bioanalista */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-muted/60 p-2 rounded-xl border border-border">
            <Building className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
            <div className="text-xs">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                Área(s) Autorizada(s)
              </span>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                {loadingAreas ? (
                  <span className="text-[11px] text-muted-foreground animate-pulse">Cargando área...</span>
                ) : userAreas.length > 0 ? (
                  userAreas.map((area) => (
                    <Badge
                      key={area.id}
                      variant="outline"
                      className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold flex items-center gap-1 py-0"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {area.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">Todas las áreas (Global)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all shrink-0 border",
                  isActive
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs font-semibold"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}
