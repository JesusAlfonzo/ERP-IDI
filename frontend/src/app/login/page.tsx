"use client";

import { useState, type FormEvent } from "react";
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
} from "lucide-react";

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
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Error de conexión con el servidor");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950">
      {/* Panel Izquierdo: Identidad Institucional y Métricas Clave */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 overflow-hidden border-r border-slate-800/80 bg-linear-to-r from-slate-950 via-slate-900 to-slate-950">
        {/* Glow decorativo de fondo */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Encabezado Superior */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-600/30">
            E
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-wide block leading-tight">
              ERP-IDI
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Gestión Integral de Almacén & Laboratorio
            </span>
          </div>
        </div>

        {/* Mensaje Central & Pilares */}
        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/60 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            Control de Calidad & Trazabilidad Farmacéutica
          </div>

          <h2 className="text-3xl font-extrabold text-white tracking-tight leading-snug">
            Instituto de Inmunología <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-300">
              Dr. Nicolás E. Bianco Colmenares
            </span>
          </h2>

          <p className="text-sm text-slate-400 leading-relaxed">
            Plataforma centralizada para la administración de insumos clínicos,
            custodia estricta de reactivos en cadena de frío y monitoreo
            continuo de solicitudes diagnósticas de la Universidad Central de
            Venezuela.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-4">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-left">
              <Snowflake className="w-5 h-5 text-blue-400 mb-2" />
              <div className="text-xs font-semibold text-slate-200">
                Cadena de Frío
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Monitoreo térmico
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-left">
              <FlaskConical className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="text-xs font-semibold text-slate-200">
                Lotes & Reactivos
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Consumo volumétrico
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-left">
              <Activity className="w-5 h-5 text-purple-400 mb-2" />
              <div className="text-xs font-semibold text-slate-200">
                Kardex Central
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Auditoría en tiempo real
              </div>
            </div>
          </div>
        </div>

        {/* Footer Institucional */}
        <div className="relative z-10 text-xs text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-6">
          <span>Universidad Central de Venezuela</span>
          <span className="font-mono">Sistema Seguro &bull; SSL/TLS</span>
        </div>
      </div>

      {/* Panel Derecho: Formulario de Acceso */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-white dark:bg-slate-900">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo Móvil */}
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
              E
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 dark:text-white block leading-tight">
                ERP-IDI
              </span>
              <span className="text-[11px] text-slate-500">
                Instituto de Inmunología - UCV
              </span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Iniciar Sesión
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ingrese sus credenciales departamentales autorizadas.
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-xs rounded-xl shadow-xs animate-in fade-in-50">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Usuario o Correo
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin o usuario@idi.ucv.ve"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900 dark:text-slate-100 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900 dark:text-slate-100 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando credenciales...</span>
                </>
              ) : (
                <span>Ingresar al Sistema</span>
              )}
            </button>
          </form>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Acceso restringido únicamente a personal técnico y administrativo
              del Instituto de Inmunología IDI-UCV.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
