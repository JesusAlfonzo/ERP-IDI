"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Snowflake,
  FlaskConical,
  PackageCheck,
  ArrowRight,
  Building2,
  Activity,
  Boxes,
  Lock,
  Sparkles,
  Thermometer,
  Layers,
  ChevronRight,
  TrendingUp,
  CreditCard,
  FileText,
  Clock,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { AuthService } from "@/services/auth.service";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"frio" | "reactivos" | "kardex" | "calidad">("frio");

  useEffect(() => {
    setIsAuthenticated(AuthService.isAuthenticated());
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white relative overflow-hidden transition-colors duration-300">
      {/* ============================================================ */}
      {/* 1. LIQUID AMBIENT GLOWS & MESH CAUSTICS                      */}
      {/* ============================================================ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Blob Cyan/Sky - Superior Central */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] sm:w-[900px] h-[450px] bg-gradient-to-tr from-sky-400/25 via-blue-500/20 to-indigo-400/15 dark:from-sky-500/15 dark:via-blue-600/15 dark:to-indigo-500/10 rounded-full blur-[110px] transform-gpu" />

        {/* Blob Índigo/Violeta - Superior Derecha */}
        <div className="absolute top-1/4 -right-24 w-[500px] h-[400px] bg-gradient-to-br from-indigo-400/20 via-purple-300/15 to-transparent dark:from-indigo-600/15 dark:via-purple-500/10 rounded-full blur-[100px] transform-gpu" />

        {/* Blob Esmeralda/Teal - Centro Izquierda */}
        <div className="absolute top-1/2 -left-32 w-[550px] h-[450px] bg-gradient-to-tr from-teal-300/20 via-cyan-400/15 to-transparent dark:from-teal-500/10 dark:via-cyan-600/10 rounded-full blur-[100px] transform-gpu" />

        {/* Blob Azul Zafiro - Inferior */}
        <div className="absolute -bottom-40 left-1/3 w-[650px] h-[400px] bg-gradient-to-r from-blue-500/15 via-sky-300/15 to-transparent dark:from-blue-600/10 dark:via-sky-500/10 rounded-full blur-[120px] transform-gpu" />

        {/* Sutil cuadrícula analítica de fondo */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0284c70a_1px,transparent_1px),linear-gradient(to_bottom,#0284c70a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_35%,#000_70%,transparent_100%)] opacity-80" />
      </div>

      {/* ============================================================ */}
      {/* 2. FLOATING LIQUID GLASS NAVBAR                              */}
      {/* ============================================================ */}
      <header className="sticky top-4 z-50 px-4 sm:px-6 w-full max-w-7xl mx-auto">
        <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/70 border border-white/80 dark:border-white/10 shadow-lg shadow-blue-500/5 dark:shadow-black/20 rounded-2xl px-4 sm:px-6 h-16 flex items-center justify-between transition-all duration-300 ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
          {/* Logo y Nombre Institucional */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-white p-1.5 border border-slate-200/80 shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform flex items-center justify-center shrink-0">
                <Image
                  src="/logo-icon.svg"
                  alt="Logo IDI"
                  width={28}
                  height={28}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-base leading-tight">
                  ERP-IDI
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/40">
                  v2.5
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block leading-tight">
                Instituto de Inmunología &bull; UCV
              </span>
            </div>
          </Link>

          {/* Enlaces de Navegación Rápida (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a
              href="#modulos"
              className="px-3.5 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Módulos
            </a>
            <a
              href="#frio"
              className="px-3.5 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Cadena de Frío
            </a>
            <a
              href="#trazabilidad"
              className="px-3.5 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Trazabilidad
            </a>
            <a
              href="#instituto"
              className="px-3.5 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Institución
            </a>
          </nav>

          {/* Acciones del Lado Derecho: Toggle de Tema & Acceso */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle className="bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/10 shadow-2xs" />

            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 active:scale-95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/25 hover:shadow-blue-500/35 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Panel Principal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 active:scale-95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/25 hover:shadow-blue-500/35 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Acceso al Sistema</span>
                <span className="sm:hidden">Ingresar</span>
              </Link>
            )}

            {/* Botón Menú Móvil */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Abrir menú de navegación"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Dropdown Menú Móvil Transpartente */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 p-4 rounded-2xl backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 border border-white/80 dark:border-white/10 shadow-xl space-y-2 animate-in fade-in slide-in-from-top-2">
            <a
              href="#modulos"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            >
              Módulos del Sistema
            </a>
            <a
              href="#frio"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            >
              Cadena de Frío & Cavas
            </a>
            <a
              href="#trazabilidad"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            >
              Trazabilidad & Kardex
            </a>
            <a
              href="#instituto"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            >
              Instituto de Inmunología
            </a>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white text-xs font-semibold py-2.5 rounded-xl shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                Iniciar Sesión
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ============================================================ */}
      {/* 3. HERO SECTION (LUMINOUS, CLINICAL & LIQUID GLASS)          */}
      {/* ============================================================ */}
      <section className="relative z-10 pt-12 sm:pt-20 pb-16 px-6 max-w-6xl mx-auto text-center space-y-8">
        {/* Badge Cápsula Translúcida */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md bg-white/70 dark:bg-white/10 border border-blue-200/80 dark:border-white/15 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-xs ring-1 ring-blue-500/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-blue-400" />
          </span>
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Plataforma Oficial de Gestión &bull; IDI UCV</span>
        </div>

        {/* Título Principal de Alto Impacto */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
          Gestión Clínica de Vanguardia, <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-blue-400 dark:via-indigo-300 dark:to-sky-300">
            Trazabilidad Analítica & Cadena de Frío
          </span>
        </h1>

        {/* Subtítulo Descriptivo y Fresco */}
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
          Control integral de reactivos inmunológicos, auditoría de lotes por alícuotas,
          monitoreo térmico permanente de cavas y despacho automatizado para el{" "}
          <strong className="text-slate-900 dark:text-white font-semibold">
            Instituto de Inmunología &quot;Dr. Nicolás E. Bianco Colmenares&quot;
          </strong>.
        </p>

        {/* Botones de Acción Hero */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span>Ingresar a la Plataforma</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href="#modulos"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl backdrop-blur-md bg-white/70 dark:bg-slate-800/60 hover:bg-white/95 dark:hover:bg-slate-800/90 text-slate-700 dark:text-slate-200 text-sm font-semibold border border-white/90 dark:border-white/10 shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer ring-1 ring-black/[0.04]"
          >
            <Layers className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Explorar Módulos</span>
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        {/* Sellos de Respaldo */}
        <div className="pt-4 flex items-center justify-center gap-6 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            Facultad de Medicina &bull; UCV
          </span>
          <span className="hidden sm:inline">&bull;</span>
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            Seguridad Criptográfica & RBAC
          </span>
        </div>

        {/* ============================================================ */}
        {/* 4. SHOWCASE HERO CARD (LIQUID GLASS DASHBOARD PREVIEW)        */}
        {/* ============================================================ */}
        <div className="pt-8">
          <div className="relative mx-auto max-w-5xl rounded-3xl backdrop-blur-2xl bg-white/60 dark:bg-slate-900/50 border border-white/80 dark:border-white/10 shadow-2xl shadow-blue-500/10 dark:shadow-black/40 p-5 sm:p-7 text-left ring-1 ring-black/[0.03] overflow-hidden">
            {/* Brillo especular superior */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent" />

            {/* Cabecera del Showcase */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-slate-200/70 dark:border-white/10 gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600/30" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600/30" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/30" />
                </div>
                <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-mono">
                  <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  MONITOR DE ESTADO HOSPITALARIO EN TIEMPO REAL
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  100% Operativo
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  Red UCV
                </span>
              </div>
            </div>

            {/* Selector de pestañas interactivas del showcase */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab("frio")}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "frio"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-800/70 border border-white/60 dark:border-white/5"
                }`}
              >
                <Snowflake className="w-3.5 h-3.5" />
                <span>Cadena de Frío</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("reactivos")}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "reactivos"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-800/70 border border-white/60 dark:border-white/5"
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Bioanálisis</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("kardex")}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "kardex"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-800/70 border border-white/60 dark:border-white/5"
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Kardex 360°</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("calidad")}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "calidad"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-800/70 border border-white/60 dark:border-white/5"
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Calidad</span>
              </button>
            </div>

            {/* Contenido Dinámico de las Pestañas */}
            {activeTab === "frio" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Cava Principal 01
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      +4.2 °C
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                      Estable
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Objetivo: 2°C a 8°C &bull; Sensores OK
                  </span>
                </div>

                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Ultracongelador -80°C
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      -79.6 °C
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                      Óptimo
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Custodia de muestras biológicas
                  </span>
                </div>

                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Alícuotas Refrigeradas
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      2,480
                    </span>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                      En Sala
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Trazabilidad por lote y posición
                  </span>
                </div>

                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Alertas Térmicas Activas
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      0
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Normal
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Sin desviaciones registradas
                  </span>
                </div>
              </div>
            )}

            {activeTab === "reactivos" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Reactivos de Laboratorio
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    84 Formulaciones
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Bioanálisis, Citometría y ELISA
                  </span>
                </div>

                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Consumo Volumétrico Hoy
                  </span>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    125.4 mL
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Descontado por ensayo clínico
                  </span>
                </div>

                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Próximos a Vencer
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    2 Lotes
                  </div>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">
                    Alerta de 30 días preventiva
                  </span>
                </div>

                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Ensayos Auditados
                  </span>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                    100%
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Firma de analista certificada
                  </span>
                </div>
              </div>
            )}

            {activeTab === "kardex" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Submódulos Auditados
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    5 Áreas
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Almacén, Compras, Lab, Solicitudes, Caja
                  </span>
                </div>

                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Entradas por Compras
                  </span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    +1,200 UND
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Recepciones auditadas este mes
                  </span>
                </div>

                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Despachos a Departamentos
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    38 Solicitudes
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Entregas a salas asistenciales
                  </span>
                </div>

                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Control de Acceso
                  </span>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                    ADMIN
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Custodia estricta por roles
                  </span>
                </div>
              </div>
            )}

            {activeTab === "calidad" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Lotes en Cuarentena
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    0 Lotes
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
                    Todos los lotes inspeccionados
                  </span>
                </div>

                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Certificación por Lote
                  </span>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                    100%
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Liberación formal de reactivos
                  </span>
                </div>

                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Mermas & Descartes
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    0.02%
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Índice de pérdida optimizado
                  </span>
                </div>

                <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Auditoría Sanitaria
                  </span>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    Activa
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Protocolos clínicos IDI-UCV
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. SECCIÓN DE MÓDULOS ESPECIALIZADOS (LIQUID GLASS CARDS)    */}
      {/* ============================================================ */}
      <section id="modulos" className="py-20 max-w-7xl mx-auto px-6 w-full relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/70 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200/60 dark:border-blue-800/40">
            <Boxes className="w-3.5 h-3.5" />
            Arquitectura Hospitalaria Unificada
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Módulos Diseñados para Bioanálisis & Almacén
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Plataforma integral concebida con estándares hospitalarios de alta exigencia,
            trazabilidad analítica y control financiero multimoneda.
          </p>
        </div>

        {/* Rejilla de 6 Tarjetas con Efecto Liquid Glass */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Cadena de Frío */}
          <div
            id="frio"
            className="group relative p-7 rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 border border-white/90 dark:border-white/10 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-300/80 dark:hover:border-blue-500/30 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/15 to-sky-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Snowflake className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                  Criocustodia & Control
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Cadena de Frío Hospitalaria
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Supervisión de cavas de almacenamiento, neveras y ultracongeladores a -80°C.
                Trazabilidad por posición de alícuotas y registro de excursiones de temperatura.
              </p>
            </div>
            <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span>Monitoreo 2°C a 8°C</span>
              <Thermometer className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: Consumo Volumétrico */}
          <div
            id="trazabilidad"
            className="group relative p-7 rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 border border-white/90 dark:border-white/10 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-300/80 dark:hover:border-emerald-500/30 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FlaskConical className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                  Bioanálisis & Sala
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Consumo Volumétrico por Ensayo
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Descuento fraccionado en mililitros, microlitros o determinaciones directas.
                Asignación por protocolo diagnóstico, paciente y firma digital del analista.
              </p>
            </div>
            <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Trazabilidad Analítica</span>
              <Activity className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3: Kardex 360 */}
          <div className="group relative p-7 rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 border border-white/90 dark:border-white/10 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-300/80 dark:hover:border-purple-500/30 transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/15 to-indigo-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
                  Exclusivo Administrador
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Kardex Integral Multimódulo
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Auditoría permanente clasificada en 5 submódulos del sistema: Almacén, Compras,
                Laboratorio, Solicitudes Departamentales y Tesorería institucional.
              </p>
            </div>
            <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
              <span>5 Submódulos Auditados</span>
              <FileText className="w-4 h-4" />
            </div>
          </div>

          {/* Card 4: Control de Calidad & Cuarentena */}
          <div className="group relative p-7 rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 border border-white/90 dark:border-white/10 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 hover:border-amber-300/80 dark:hover:border-amber-500/30 transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                  Seguridad Sanitaria
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Aseguramiento de Calidad
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Aislamiento estricto de insumos recibidos en cuarentena. Inspección analítica,
                verificación de caducidad y liberación documental formal para uso asistencial.
              </p>
            </div>
            <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
              <span>Cuarentena & Certificación</span>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          {/* Card 5: Compras & Cuentas por Pagar */}
          <div className="group relative p-7 rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 border border-white/90 dark:border-white/10 shadow-sm hover:shadow-xl hover:shadow-sky-500/10 hover:border-sky-300/80 dark:hover:border-sky-500/30 transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500/15 to-blue-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 block mb-1">
                  Finanzas & Proveedores
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Compras & Cuentas por Pagar
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Conciliación multimoneda en USD y Bolívares con tasa oficial BCV. Búsqueda inteligente
                de proveedores, egresos directos, órdenes de compra y control de amortizaciones.
              </p>
            </div>
            <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-sky-600 dark:text-sky-400">
              <span>Bimonetario USD / VES</span>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          {/* Card 6: Ventanilla de Solicitudes Internas */}
          <div className="group relative p-7 rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 border border-white/90 dark:border-white/10 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-300/80 dark:hover:border-indigo-500/30 transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                  Dispensación Clínica
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Ventanilla de Solicitudes
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Canal centralizado para las peticiones de insumos desde salas médicas y departamentos.
                Flujo de revisión, aprobación con validación por renglón y despacho en ventanilla.
              </p>
            </div>
            <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span>Aprobación & Entrega</span>
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. BANNER INSTITUCIONAL & AUTORIDAD (IDI - UCV)              */}
      {/* ============================================================ */}
      <section id="instituto" className="py-16 max-w-7xl mx-auto px-6 w-full relative z-10">
        <div className="rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-sky-500/10 dark:from-blue-900/25 dark:via-slate-900/40 dark:to-indigo-900/20 border border-blue-200/80 dark:border-white/10 p-8 sm:p-12 shadow-xl shadow-blue-500/5">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold shadow-xs">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Patrimonio Científico & Académico</span>
                </div>
                <div className="bg-white/95 rounded-xl px-3 py-1 border border-slate-200/80 shadow-xs inline-flex items-center justify-center">
                  <Image
                    src="/logo-full.svg"
                    alt="Logo IDI Completo"
                    width={100}
                    height={42}
                    className="h-5 w-auto object-contain"
                  />
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Instituto de Inmunología &quot;Dr. Nicolás E. Bianco Colmenares&quot;
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Referencia nacional e internacional en diagnóstico inmunológico, docencia médica de
                postgrado e investigación traslacional en la Facultad de Medicina de la Universidad
                Central de Venezuela.
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  Caracas, Venezuela
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  Ciudad Universitaria UCV
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  Gestión Hospitalaria Digital
                </span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/25 cursor-pointer text-center"
              >
                <Lock className="w-4 h-4" />
                <span>Ingresar al Sistema ERP</span>
              </Link>
              <a
                href="https://idiucv.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl backdrop-blur-md bg-white/70 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200/80 dark:border-white/10 transition-all cursor-pointer text-center"
              >
                <span>Portal Web del Instituto IDI</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. PIE DE PÁGINA (LIQUID GLASS FOOTER)                       */}
      {/* ============================================================ */}
      <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl bg-white/40 dark:bg-slate-950/60 py-10 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs border border-slate-200/60 dark:border-white/10 shrink-0">
              <Image
                src="/logo-icon.svg"
                alt="Logo IDI"
                width={24}
                height={24}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                ERP-IDI &bull; Sistema de Gestión Hospitalaria
              </span>
              <span className="text-[11px] text-slate-400">
                Instituto de Inmunología &bull; Facultad de Medicina &bull; UCV
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px] font-medium">
            <Link href="/login" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Iniciar Sesión
            </Link>
            <a href="#modulos" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Módulos
            </a>
            <a href="#frio" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Cadena de Frío
            </a>
            <a
              href="https://idiucv.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
            >
              <span>Portal IDI</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="font-mono text-[10px]">Caracas, Venezuela</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
