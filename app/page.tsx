"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import {
  ShieldCheck,
  Zap,
  Bell,
  ArrowRight,
  Building2,
  Lock,
  Sparkles,
  QrCode,
  Smartphone,
  Wallet,
  Compass,
  ChevronRight,
  TrendingUp,
  CheckCircle,
} from "lucide-react";

export default function AppleLandingPage() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [trmCOP, setTrmCOP] = useState<number>(4180.5);
  const [eurCOP, setEurCOP] = useState<number>(4435.2);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (sesion) {
      router.replace(sesion.usuario.role === "admin" ? "/admin" : "/cliente");
      return;
    }
    setVerificando(false);

    // Consultar TRM oficial en segundo plano
    const transferUrl = process.env.NEXT_PUBLIC_TRANSFER_API_URL ?? "http://localhost:8004";
    fetch(`${transferUrl}/transfers/trm`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.trm_vigente) setTrmCOP(parseFloat(data.trm_vigente));
      })
      .catch(() => {});
  }, [router]);

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-900">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="h-16 w-16 rounded-3xl bg-white border border-slate-200/80 flex items-center justify-center text-sky-600 shadow-xl shadow-sky-500/10">
            <Building2 size={32} />
          </div>
          <span className="text-xs font-bold tracking-widest uppercase text-slate-400">
            BankLite
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-sky-500/20 selection:text-sky-950 relative overflow-hidden">
      {/* Ambient Glow Lights (Luminous Apple Glass Canvas) */}
      <div className="apple-ambient-glow w-[650px] h-[450px] -top-32 -left-20 bg-gradient-to-tr from-sky-300/40 via-cyan-200/30 to-transparent" />
      <div className="apple-ambient-glow w-[700px] h-[500px] top-40 right-[-150px] bg-gradient-to-bl from-emerald-200/35 via-teal-100/25 to-transparent" />
      <div className="apple-ambient-glow w-[600px] h-[450px] bottom-20 left-1/3 bg-gradient-to-t from-sky-200/30 via-indigo-100/20 to-transparent" />

      {/* Ticker Superior de Mercados en Vivo (Apple Financial Style) */}
      <div className="border-b border-slate-200/70 bg-white/70 backdrop-blur-md text-xs py-2 px-4 relative z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-slate-600">
          <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap scrollbar-none">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-700">TRM Oficial Superfinanciera:</span>
              <span className="font-mono text-emerald-600 font-bold">
                ${trmCOP.toLocaleString("es-CO")} COP
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-slate-700">EUR / COP:</span>
              <span className="font-mono text-sky-600 font-semibold">${eurCOP.toLocaleString("es-CO")}</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">Green API & Gmail 2FA:</span>
              <span className="text-slate-800 font-bold">En Línea</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-slate-500 text-[11px] font-semibold">
            <span>Datos en Vivo</span>
            <TrendingUp size={13} className="text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Barra de Navegación Translúcida (Apple Frosted Glass) */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/75 backdrop-blur-2xl transition-all">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-white flex items-center justify-center font-bold shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform duration-200">
              <Building2 size={20} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">BankLite</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-full transition-colors active:scale-[0.97]"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login?modo=registro"
              className="apple-primary-button text-xs sm:text-sm font-bold text-white px-5 py-2.5 rounded-full shadow-md"
            >
              Abrir cuenta
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION: Estilo Apple WWDC / Apple Card */}
      <section className="relative pt-20 pb-28 px-6">
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-sky-200/80 bg-white/80 backdrop-blur-md text-xs font-bold tracking-wider text-sky-800 uppercase shadow-sm">
            <Sparkles size={14} className="text-sky-500" />
            Diseñado con precisión • BankLite OS
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.08] text-slate-950">
            El banco que se siente como el{" "}
            <span className="apple-text-gradient-cyan">futuro.</span>
          </h1>

          <p className="text-lg sm:text-2xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Ingreso biométrico con confirmación instantánea por correo electrónico. Cero fricción, máxima protección de capital.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?modo=registro"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 apple-primary-button font-bold text-base px-8 py-4 rounded-full shadow-xl shadow-sky-500/25 transition-all duration-200"
            >
              Comenzar ahora
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 apple-glass-button text-slate-700 hover:text-slate-950 font-bold text-base px-8 py-4 rounded-full shadow-md transition-all duration-200"
            >
              Acceso Clientes
            </Link>
          </div>
        </div>

      </section>

      {/* BENTO GRID: Apple WWDC Feature Architecture */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-200/80">
        <div className="text-center mb-16 space-y-3">
          <p className="text-xs uppercase tracking-widest text-sky-600 font-black">
            Capacidades del Sistema
          </p>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900">
            Ingeniería financiera en cada detalle.
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-base">
            Ocho microservicios sincronizados en milisegundos para darte la experiencia más rápida y segura.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Bento 1: Bolsillos de Ahorro (Tarjeta Ancha - 2 Columnas) */}
          <div className="md:col-span-2 apple-glass-card rounded-3xl p-8 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shadow-sm">
                <Wallet size={24} />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-slate-900">
                Bolsillos Inteligentes
              </h3>
              <p className="text-slate-600 text-sm max-w-md leading-relaxed">
                Separa tu dinero en metas específicas y sigue tu progreso.
              </p>
            </div>

            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold text-slate-700">
              <li className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-sm">Crea una meta de ahorro</li>
              <li className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-sm">Aparta dinero de tu cuenta</li>
              <li className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-sm">Sigue tu progreso</li>
            </ul>
          </div>

          {/* Bento 2: Clave Dinámica 2FA (Email) */}
          <div className="apple-glass-card rounded-3xl p-8 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-sky-50 border border-sky-200/80 text-sky-600 flex items-center justify-center shadow-sm">
                <Smartphone size={24} />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-slate-900">
                2FA Multicanal
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Confirmación de acceso enviada al instante a tu correo electrónico vía Brevo Transactional Email.
              </p>
            </div>
            <div className="mt-6 p-4 rounded-2xl bg-sky-50/70 border border-sky-200/70 text-center shadow-inner">
              <span className="text-[11px] text-sky-700 uppercase tracking-widest block font-black mb-1">
                Clave Dinámica Activa
              </span>
              <span className="font-mono text-3xl font-black text-slate-900 tracking-[0.25em]">
                190 442
              </span>
            </div>
          </div>

          {/* Bento 3: Saca Plata / Retiro sin Tarjeta */}
          <div className="apple-glass-card rounded-3xl p-8 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-purple-50 border border-purple-200/80 text-purple-600 flex items-center justify-center shadow-sm">
                <Zap size={24} />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-slate-900">
                Saca Plata
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Genera tokens temporales de 6 dígitos con vencimiento de 15 minutos para retiros sin plástico en cajeros.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200/80 text-xs shadow-sm">
              <span className="text-slate-500 font-semibold">Token de retiro:</span>
              <span className="font-mono text-purple-600 font-black">TOKEN-883412</span>
            </div>
          </div>

          {/* Bento 4: Pagos QR Instantáneos */}
          <div className="apple-glass-card rounded-3xl p-8 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shadow-sm">
                <QrCode size={24} />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-slate-900">
                Pagos con QR
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Genera y escanea códigos QR interoperables con Bre-B para transferir fondos al instante sin digitar cuentas.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-center py-2">
              <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-lg">
                <QrCode size={56} className="text-slate-900" />
              </div>
            </div>
          </div>

          {/* Bento 5: Prevención de Fraude en Tiempo Real */}
          <div className="apple-glass-card rounded-3xl p-8 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shadow-sm">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-slate-900">
                Radar Antifraude
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Algoritmos SARLAFT con validación de velocidad, doble partida contable en Ledger y listas restrictivas.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-rose-700 bg-rose-50 p-3 rounded-2xl border border-rose-200/80 font-bold">
              <ShieldCheck size={16} />
              <span>Protección 100% de transacciones</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER: Minimalismo Apple */}
      <footer className="border-t border-slate-200/80 bg-white/70 backdrop-blur-md text-slate-500 text-xs py-12 px-6 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="h-6 w-6 rounded-lg bg-sky-500 text-white flex items-center justify-center">
              <Building2 size={14} />
            </div>
            <span className="font-extrabold tracking-tight text-sm text-slate-900">BankLite Core Banking</span>
          </div>
          <p>© {new Date().getFullYear()} BankLite. Inspirado en el diseño fluido, materiales y luz de Apple.</p>
          <div className="flex items-center gap-4 text-slate-600 font-semibold">
            <Link href="/login" className="hover:text-slate-900 transition-colors">
              Portal Clientes
            </Link>
            <span>•</span>
            <Link href="/login" className="hover:text-slate-900 transition-colors">
              Acceso Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
