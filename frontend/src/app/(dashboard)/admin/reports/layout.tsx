"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, GitCommit, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navLinks = [
    {
      label: "Costo por Examen & Consolidado Financiero",
      href: "/admin/reports",
      icon: BarChart3,
      exact: true,
    },
    {
      label: "Trazabilidad Punta a Punta de Lotes",
      href: "/admin/reports/traceability",
      icon: GitCommit,
      exact: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado Superior */}
      <div className="border-b border-border pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
              <span>Administración Financiera &bull; Fase 4</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
              Reportes Financieros & Trazabilidad
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Consolidación de costos directos de corridas clínicas, gasto en investigación y trazabilidad de lotes.
            </p>
          </div>
        </div>

        {/* Pestañas de Navegación de Reportes */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all shrink-0 border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
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
