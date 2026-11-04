"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, ShieldAlert, Snowflake, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navLinks = [
    {
      label: "Bandeja FEFO de Solicitudes",
      href: "/coordinator/requests",
      icon: ClipboardCheck,
    },
    {
      label: "Gestión de Cuarentena & Calidad",
      href: "/coordinator/quarantine",
      icon: ShieldAlert,
    },
    {
      label: "Arqueo y Cotejo de Neveras",
      href: "/coordinator/fridge-audit",
      icon: Snowflake,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Coordinación Operativa y Aseguramiento</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
              Panel de Coordinación de Laboratorio
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Control centralizado de despacho FEFO, control de calidad/cuarentena y arqueos físicos de neveras.
            </p>
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
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs font-semibold"
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
