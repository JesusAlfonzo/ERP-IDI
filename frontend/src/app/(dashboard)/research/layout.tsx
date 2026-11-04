"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Microscope, Package, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navLinks = [
    {
      label: "Proyectos & Presupuesto",
      href: "/research/projects",
      icon: Microscope,
    },
    {
      label: "Donaciones & Stock Blindado",
      href: "/research/donations",
      icon: Package,
    },
    {
      label: "Bitácora Ensayos & Hallazgos",
      href: "/research/trials",
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Innovación, Investigación & Docencia</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
              Investigación y Desarrollo (I+D)
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Administración de ensayos científicos, blindaje de stock por donaciones y seguimiento presupuestario de proyectos.
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
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs font-semibold"
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
