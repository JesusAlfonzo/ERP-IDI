"use client";

import React from "react";
import Link from "next/link";
import { CustomReportBuilder } from "@/components/reports/CustomReportBuilder";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  FlaskConical,
  Snowflake,
  ShieldAlert,
  ClipboardList,
  FileCheck2,
  ArrowRight,
} from "lucide-react";

export default function LabReportsPage() {
  return (
    <div className="space-y-6">
      {/* Encabezado Institucional del Centro de Reportes de Laboratorio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
            <span>Auditoría Analítica & Certificados Oficiales</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Reportes & Auditoría de Laboratorio Clínico
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generación y exportación de documentos oficiales PDF para trazabilidad de reactivos, cadena de frío, consumos 5D y actas de calidad.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 h-9">
            <Link href="/lab/runs">
              <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
              Ver Corridas
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 h-9">
            <Link href="/lab/fridges">
              <Snowflake className="w-3.5 h-3.5 text-cyan-600" />
              Arqueos de Cava
            </Link>
          </Button>
        </div>
      </div>

      {/* Tarjetas de Acceso Rápido a Actas y Certificados Específicos de Laboratorio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Link
          href="/lab/runs"
          className="group block p-3.5 rounded-xl border border-border/80 bg-card hover:border-emerald-300 dark:hover:border-emerald-800 hover:shadow-xs transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <FlaskConical className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-xs text-foreground mt-2.5">
            Reportes de Corridas 5D
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Costo efectivo unitario por paciente, calibraciones y repeticiones.
          </p>
        </Link>

        <Link
          href="/lab/fridges"
          className="group block p-3.5 rounded-xl border border-border/80 bg-card hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-xs transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600">
              <Snowflake className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-xs text-foreground mt-2.5">
            Actas de Arqueo Térmico
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Conciliación de cavas, diferencias físicas y estabilidad de cadena de frío.
          </p>
        </Link>

        <Link
          href="/lab/quality"
          className="group block p-3.5 rounded-xl border border-border/80 bg-card hover:border-rose-300 dark:hover:border-rose-800 hover:shadow-xs transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-rose-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-xs text-foreground mt-2.5">
            Actas de Cuarentena & Calidad
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Retención de insumos, dictamen técnico y bitácora inmutable 5D.
          </p>
        </Link>

        <Link
          href="/lab/requests"
          className="group block p-3.5 rounded-xl border border-border/80 bg-card hover:border-purple-300 dark:hover:border-purple-800 hover:shadow-xs transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600">
              <ClipboardList className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-purple-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-xs text-foreground mt-2.5">
            Comprobantes de Despacho FEFO
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Actas de entrega con asignación de frascos y blindaje I+D.
          </p>
        </Link>
      </div>

      {/* Generador Avanzado de Reportes y Documentos PDF Nativos */}
      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-0">
          <CustomReportBuilder />
        </CardContent>
      </Card>
    </div>
  );
}
