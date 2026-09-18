import Link from "next/link";
import {
  ShieldCheck,
  Snowflake,
  FlaskConical,
  PackageCheck,
  ArrowRight,
  Building,
  Activity,
  Boxes,
  Lock,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Barra de navegación superior */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-600/30">
              E
            </div>
            <div>
              <span className="font-bold text-white tracking-wide block leading-tight">
                ERP-IDI
              </span>
              <span className="text-[10px] text-slate-400">
                Instituto de Inmunología &bull; UCV
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-md shadow-blue-600/20"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Acceso al Sistema</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 lg:pt-28 lg:pb-24 border-b border-slate-800/80">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-87.5 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-75 h-62.5 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-blue-400 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            <span>Plataforma Oficial de Gestión &bull; IDI UCV</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Control de Insumos Clínicos & <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 via-indigo-300 to-sky-400">
              Cadena de Frío Hospitalaria
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed">
            Sistema unificado para la administración de reactivos inmunológicos,
            trazabilidad volumétrica de lotes, control de cuarentena y auditoría
            de movimientos de inventario para el Instituto de Inmunología.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/25"
            >
              <span>Ingresar a la Plataforma</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-800 text-slate-300 text-sm font-medium bg-slate-900/50">
              <Building className="w-4 h-4 text-slate-400" />
              <span>Red Interna IDI-UCV</span>
            </div>
          </div>
        </div>
      </section>

      {/* Características del Sistema */}
      <section className="py-20 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center max-w-xl mx-auto mb-14 space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Módulos Especializados
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Diseñado para cumplir con estándares analíticos, trazabilidad de
            fármacos e insumos diagnósticos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Snowflake className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Cadena de Frío
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Monitoreo continuo de cavas, neveras y congeladores con
              trazabilidad por alícuota y temperatura objetivo.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Consumo Volumétrico
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Descuento fraccionado por ensayo clínico, protocolo diagnóstico y
              registro de analista responsable.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Kardex & Mermas
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Auditoría completa de entradas, despachos departamentales, bajas
              técnicas y ajustes por vencimiento.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <PackageCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Control de Calidad
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Aislamiento en cuarentena de reactivos con certificación analítica
              previa a su liberación en sala.
            </p>
          </div>
        </div>
      </section>

      {/* Banner Informativo */}
      <section className="border-y border-slate-800/80 bg-slate-900/30 py-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Acceso Departamental Centralizado
              </h4>
              <p className="text-xs text-slate-400">
                Almacén General, Laboratorios Especializados, Calidad y Compras.
              </p>
            </div>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>Iniciar sesión con credenciales institucionales</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Pie de página */}
      <footer className="mt-auto border-t border-slate-900 py-8 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Instituto de Inmunología &quot;Dr. Nicolás E. Bianco
              Colmenares&quot;
            </span>
            <span>&bull;</span>
            <span>UCV</span>
          </div>
          <div className="font-mono text-[11px]">
            ERP-IDI &bull; Caracas, Venezuela
          </div>
        </div>
      </footer>
    </div>
  );
}
