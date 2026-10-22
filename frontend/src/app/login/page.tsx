"use client";

import React, { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import {
  Lock,
  User,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  FlaskConical,
  Snowflake,
  Activity,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Building2,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { toast } from "@/utils/toast";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await AuthService.login({ identifier: username, password });
      toast.success("Sesión iniciada con éxito");
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Error de conexión con el servidor";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden transition-colors duration-300 p-4 sm:p-6 lg:p-8">
      {/* ============================================================ */}
      {/* 1. LIQUID AMBIENT GLOWS & MESH CAUSTICS                      */}
      {/* ============================================================ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Blob Cyan/Sky - Superior Izquierda */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[450px] bg-gradient-to-tr from-sky-400/25 via-blue-500/20 to-indigo-400/15 dark:from-sky-500/15 dark:via-blue-600/15 dark:to-indigo-500/10 rounded-full blur-[110px] transform-gpu" />

        {/* Blob Índigo/Violeta - Inferior Derecha */}
        <div className="absolute -bottom-32 -right-32 w-[550px] h-[450px] bg-gradient-to-br from-indigo-400/20 via-purple-300/15 to-transparent dark:from-indigo-600/15 dark:via-purple-500/10 rounded-full blur-[100px] transform-gpu" />

        {/* Blob Esmeralda - Centro */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-gradient-to-tr from-teal-300/15 via-cyan-400/10 to-transparent dark:from-teal-500/10 dark:via-cyan-600/10 rounded-full blur-[120px] transform-gpu" />

        {/* Cuadrícula analítica de fondo */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0284c70a_1px,transparent_1px),linear-gradient(to_bottom,#0284c70a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-80" />
      </div>

      {/* ============================================================ */}
      {/* 2. TOP FLOATING LIQUID GLASS BAR                             */}
      {/* ============================================================ */}
      <header className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 hover:bg-white/95 dark:hover:bg-slate-800/90 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-white/80 dark:border-white/10 shadow-xs transition-all hover:-translate-x-0.5 cursor-pointer ring-1 ring-black/[0.03]"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Volver al Inicio</span>
        </Link>

        <div className="flex items-center gap-3">
          <a
            href="https://idiucv.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md bg-white/50 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium border border-white/60 dark:border-white/10 transition-colors"
          >
            <span>Portal IDI</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <ThemeToggle className="bg-white/70 dark:bg-slate-900/60 border border-white/80 dark:border-white/10 shadow-2xs backdrop-blur-xl" />
        </div>
      </header>

      {/* ============================================================ */}
      {/* 3. CENTRAL LIQUID GLASS LOGIN CARD                           */}
      {/* ============================================================ */}
      <main className="relative z-10 w-full max-w-5xl mx-auto my-auto py-6">
        <div className="rounded-3xl backdrop-blur-2xl bg-white/70 dark:bg-slate-900/60 border border-white/90 dark:border-white/10 shadow-2xl shadow-blue-500/10 dark:shadow-black/40 overflow-hidden ring-1 ring-black/[0.04] grid grid-cols-1 lg:grid-cols-12 transition-all">
          {/* Brillo especular superior */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent" />

          {/* COLUMNA IZQUIERDA: Identidad Institucional & Pilares Hospitalarios */}
          <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-between bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-sky-500/10 dark:from-blue-900/30 dark:via-slate-900/50 dark:to-indigo-900/20 border-b lg:border-b-0 lg:border-r border-slate-200/60 dark:border-white/10 relative overflow-hidden">
            {/* Decoración de resplandor interior */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-6 relative z-10">
              {/* Logo y Nombre */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white p-2 border border-slate-200/80 dark:border-white/20 shadow-md shadow-blue-500/10 flex items-center justify-center shrink-0">
                  <Image
                    src="/logo-icon.svg"
                    alt="Logo IDI"
                    width={28}
                    height={28}
                    className="w-full h-full object-contain"
                  />
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
              </div>

              {/* Título de Bienvenida */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-md bg-white/70 dark:bg-white/10 border border-blue-200/80 dark:border-white/15 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Control Hospitalario & Trazabilidad</span>
                  </div>
                  <div className="hidden sm:inline-flex bg-white/90 dark:bg-white rounded-xl px-2.5 py-1 shadow-xs border border-slate-200/60 items-center justify-center">
                    <Image
                      src="/logo-full.svg"
                      alt="Logo IDI Full"
                      width={84}
                      height={36}
                      className="h-5 w-auto object-contain"
                      priority
                    />
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                  Instituto de Inmunología <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-blue-400 dark:via-indigo-300 dark:to-sky-300">
                    Dr. Nicolás E. Bianco Colmenares
                  </span>
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  Plataforma unificada para la custodia estricta de reactivos en cadena de frío,
                  consumo volumétrico por ensayo clínico y dispensación de insumos médicos.
                </p>
              </div>

              {/* Micro-cards de Pilares con Efecto Translúcido */}
              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <div className="p-3 rounded-2xl backdrop-blur-xl bg-white/60 dark:bg-slate-800/40 border border-white/80 dark:border-white/5 shadow-2xs text-left space-y-1">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Snowflake className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    Cadena de Frío
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    2°C a 8°C & -80°C
                  </div>
                </div>

                <div className="p-3 rounded-2xl backdrop-blur-xl bg-white/60 dark:bg-slate-800/40 border border-white/80 dark:border-white/5 shadow-2xs text-left space-y-1">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    Bioanálisis
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Por alícuota & lote
                  </div>
                </div>

                <div className="p-3 rounded-2xl backdrop-blur-xl bg-white/60 dark:bg-slate-800/40 border border-white/80 dark:border-white/5 shadow-2xs text-left space-y-1">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    Kardex 360°
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    5 submódulos
                  </div>
                </div>
              </div>
            </div>

            {/* Pie de la Columna Izquierda con Enlace al Portal */}
            <div className="pt-6 mt-6 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 relative z-10">
              <span className="flex items-center gap-1 font-medium">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                Facultad de Medicina &bull; UCV
              </span>
              <a
                href="https://idiucv.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1 font-semibold"
              >
                <span>idiucv.vercel.app</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* COLUMNA DERECHA: Formulario de Autenticación */}
          <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-center bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl">
            <div className="w-full max-w-sm mx-auto space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200/60 dark:border-blue-800/40">
                    <Lock className="w-3 h-3" />
                    Acceso Autorizado
                  </div>
                  <div className="lg:hidden w-7 h-7 rounded-lg bg-white p-1 border border-slate-200 shadow-2xs flex items-center justify-center">
                    <Image
                      src="/logo-icon.svg"
                      alt="Logo IDI"
                      width={18}
                      height={18}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Iniciar Sesión
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ingrese con sus credenciales institucionales registradas.
                </p>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-rose-300/80 dark:border-rose-500/30 bg-rose-50/90 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs shadow-2xs animate-in fade-in slide-in-from-top-1"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span className="leading-snug font-medium flex-1">
                    {errorMsg}
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Campo Usuario o Correo */}
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Usuario o Correo Electrónico
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
                      <User className="w-4 h-4" />
                    </span>
                    <Input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Usuario o correo electrónico"
                      className="pl-10 h-11 bg-white/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/30 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Campo Contraseña */}
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </span>
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="pl-10 pr-10 h-11 bg-white/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/30 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      tabIndex={-1}
                      aria-label="Alternar visibilidad de contraseña"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Botón de Enviar con Gradiente y Resplandor */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 gap-2 font-bold text-xs bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validando credenciales...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                      <span>Ingresar a la Plataforma</span>
                    </>
                  )}
                </Button>
              </form>

              {/* Mensaje de Seguridad / Acceso Departamental */}
              <div className="pt-4 border-t border-slate-200/70 dark:border-white/10 text-center space-y-2">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Conexión cifrada de extremo a extremo</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Acceso exclusivo para personal médico, bioanalistas y administradores del IDI-UCV.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* 4. FOOTER                                                    */}
      {/* ============================================================ */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto py-2 text-center text-[11px] text-slate-400">
        <span>ERP-IDI &bull; Instituto de Inmunología &quot;Dr. Nicolás E. Bianco Colmenares&quot; &bull; UCV</span>
      </footer>
    </div>
  );
}
