"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  Package,
  ClipboardList,
  ShoppingCart,
  Layers,
  SearchX,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const QUICK_MODULES = [
  {
    title: "Inventario",
    href: "/inventory/products",
    icon: Package,
    description: "Stock físico, insumos y reactivos",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    title: "Pedidos y Solicitudes",
    href: "/requests",
    icon: ClipboardList,
    description: "Requisiciones internas y despachos",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    title: "Compras y Proveedores",
    href: "/purchasing/orders",
    icon: ShoppingCart,
    description: "Órdenes comerciales y abastecimiento",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    title: "Kardex de Movimientos",
    href: "/inventory/kardex",
    icon: Layers,
    description: "Trazabilidad y auditoría de stock",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
];

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-background via-muted/20 to-background p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Luz ambiental decorativa de fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[340px] bg-primary/10 dark:bg-primary/5 blur-3xl rounded-full pointer-events-none -z-10" />

      {/* ========================================================
          BARRA SUPERIOR / LOGOTIPO INSTITUCIONAL
         ======================================================== */}
      <header className="flex items-center justify-between gap-4 max-w-5xl mx-auto w-full z-10">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1"
        >
          <div className="w-9 h-9 rounded-xl bg-card border border-border shadow-2xs flex items-center justify-center p-1.5 transition-transform group-hover:scale-105">
            <Image
              src="/logo-icon.svg"
              alt="Logotipo ERP-IDI"
              width={26}
              height={26}
              className="dark:brightness-125"
              priority
            />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-foreground block group-hover:text-primary transition-colors">
              ERP-IDI
            </span>
            <span className="text-[11px] text-muted-foreground block leading-tight font-medium">
              Instituto de Inmunología · UCV
            </span>
          </div>
        </Link>
      </header>

      {/* ========================================================
          HERO CENTRAL: ERROR 404
         ======================================================== */}
      <main className="max-w-2xl mx-auto my-auto text-center py-10 sm:py-14 space-y-8 z-10 w-full">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center">
            <Badge
              variant="outline"
              className="px-3 py-1 text-xs gap-1.5 font-mono border-primary/30 text-primary bg-primary/5 shadow-2xs font-semibold"
            >
              <SearchX className="w-3.5 h-3.5 text-primary" />
              <span>Error 404 · Ruta No Encontrada</span>
            </Badge>
          </div>

          <div className="relative">
            <h1 className="text-8xl sm:text-9xl font-black font-mono tracking-tighter bg-gradient-to-b from-foreground via-foreground/80 to-muted-foreground/30 bg-clip-text text-transparent select-none leading-none">
              404
            </h1>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Página no encontrada
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              La dirección web ingresada no existe, ha sido reubicada o requiere
              permisos de acceso diferentes.
            </p>
          </div>
        </div>

        {/* Botones de acción principales */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto gap-2 font-bold text-xs h-10 px-6 shadow-2xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/dashboard">
              <Home className="w-4 h-4" />
              <span>Ir al Panel Principal</span>
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.back()}
            className="w-full sm:w-auto gap-2 text-xs font-semibold h-10 px-6 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Regresar a la anterior</span>
          </Button>
        </div>

        {/* Tarjetas de Accesos Rápidos a Módulos */}
        <div className="pt-4 space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Accesos rápidos del sistema</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {QUICK_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="group block focus:outline-none"
                >
                  <Card className="p-3.5 border-border shadow-2xs hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${mod.bg} ${mod.color}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors block truncate">
                          {mod.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {mod.description}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 opacity-60 group-hover:opacity-100" />
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      {/* ========================================================
          PIE DE PÁGINA INSTITUCIONAL
         ======================================================== */}
      <footer className="text-center text-[11px] text-muted-foreground border-t border-border/60 pt-4 max-w-5xl mx-auto w-full z-10 space-y-1">
        <p className="font-medium text-foreground/80">
          Instituto de Inmunología Dr. Nicolás E. Bianco C. · Universidad Central de Venezuela (UCV)
        </p>
        <p className="text-muted-foreground/70">
          ERP-IDI · Sistema de Planeación de Recursos Empresariales
        </p>
      </footer>
    </div>
  );
}
