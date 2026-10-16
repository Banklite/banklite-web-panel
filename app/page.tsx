"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import {
  ShieldCheck,
  Zap,
  CreditCard,
  Bell,
  ArrowRight,
  Building2,
  Lock,
  Sparkles,
  QrCode,
  Smartphone,
  Wallet,
  Compass,
  Repeat,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export default function AppleLandingPage() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [trmCOP, setTrmCOP] = useState<number>(4180.50);
  const [eurCOP, setEurCOP] = useState<number>(4435.20);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (sesion) {
      router.replace(sesion.usuario.role === "admin" ? "/admin" : "/cliente");
      return;
    }
    setVerificando(false);

    // Consultar TRM oficial en segundo plano
    fetch("http://localhost:8004/transfers/trm")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.trm_vigente) setTrmCOP(parseFloat(data.trm_vigente));
      })
      .catch(() => {});
  }, [router]);

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="h-16 w-16 rounded-3xl bg-neutral-900 border border-white/10 flex items-center justify-center text-white shadow-2xl">
            <Building2 size={32} />
          </div>
          <span className="text-sm font-medium tracking-widest uppercase text-neutral-400">
            BankLite
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 selection:text-white">
      {/* Ticker Superior de Mercados en Vivo (Apple Financial Style) */}
      <div className="border-b border-white/[0.08] bg-neutral-950/70 backdrop-blur-md text-xs py-2 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-neutral-400">
          <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap scrollbar-none">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-neutral-200">TRM Oficial Superfinanciera:</span>
              <span className="font-mono text-emerald-400 font-bold">
                ${trmCOP.toLocaleString("es-CO")} COP
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-neutral-500">•</span>
              <span className="font-semibold text-neutral-300">EUR / COP:</span>
              <span className="font-mono text-cyan-400">${eurCOP.toLocaleString("es-CO")}</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-neutral-500">•</span>
              <span className="text-neutral-400">Green API & Gmail 2FA:</span>
              <span className="text-neutral-300 font-bold">En Línea</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 text-neutral-400 text-[11px]">
            <span>Datos en Vivo</span>
            <TrendingUp size={13} className="text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Barra de Navegación Translúcida (Apple Navbar) */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-black/60 backdrop-blur-2xl transition-all">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-white text-black flex items-center justify-center font-bold shadow-md shadow-white/10 group-hover:scale-105 transition-transform duration-200">
              <Building2 size={20} />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">BankLite</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-neutral-300 hover:text-white px-4 py-2 rounded-full transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login?modo=registro"
              className="apple-glass-button text-xs sm:text-sm font-semibold text-white px-5 py-2.5 rounded-full shadow-lg"
            >
              Abrir cuenta
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION: Estilo Apple WWDC / Apple Card */}
      <section className="relative pt-20 pb-28 px-6 overflow-hidden">
        {/* Luces de Fondo Ambientales (Luminous Glows) */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-500/20 via-emerald-500/15 to-purple-500/20 blur-[130px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md text-xs font-semibold tracking-wider text-neutral-300 uppercase">
            <Sparkles size={14} className="text-emerald-400" />
            Diseñado con precisión • BankLite OS
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.08] apple-text-gradient">
            El banco que se siente como el futuro.
          </h1>

          <p className="text-lg sm:text-2xl text-neutral-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Ingreso biométrico con confirmación instantánea por WhatsApp y correo. Cero fricción, máxima protección de capital.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?modo=registro"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-black hover:bg-neutral-200 active:scale-[0.98] font-bold text-base px-8 py-4 rounded-full shadow-2xl shadow-white/20 transition-all duration-200"
            >
              Comenzar ahora
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 apple-glass text-neutral-200 hover:text-white active:scale-[0.98] font-semibold text-base px-8 py-4 rounded-full transition-all duration-200"
            >
              Acceso Clientes
            </Link>
          </div>
        </div>

        {/* HERO INTERACTIVO: Tarjeta de Titanio 3D con Giro (Apple Card Replica) */}
        <div className="relative z-10 max-w-lg mx-auto mt-16 perspective-1000">
          <div
            onClick={() => setCardFlipped(!cardFlipped)}
            className={`cursor-pointer transition-transform duration-700 transform-style-3d ${
              cardFlipped ? "rotate-y-180" : ""
            }`}
          >
            {/* CARA FRONTAL: Apple Card Titanium */}
            <div className="w-full aspect-[1.586/1] rounded-3xl p-7 flex flex-col justify-between apple-glass-card border border-white/20 shadow-2xl relative overflow-hidden group select-none">
              {/* Reflejo metálico de titanio */}
              <div className="absolute inset-0 titanium-shimmer pointer-events-none" />

              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                    <Building2 size={18} />
                  </div>
                  <span className="font-bold tracking-tight text-white text-lg">BankLite</span>
                </div>
                {/* Chip EMV y Contactless */}
                <div className="flex items-center gap-3">
                  <div className="h-7 w-9 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-inner flex items-center justify-center opacity-90">
                    <div className="w-5 h-4 border border-amber-800/40 rounded-sm" />
                  </div>
                  <span className="text-neutral-400 text-lg font-bold">)))</span>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="font-mono text-xl sm:text-2xl tracking-[0.25em] text-neutral-100 font-semibold drop-shadow">
                  4532 •••• •••• 9012
                </div>
                <div className="flex items-end justify-between text-xs text-neutral-400 uppercase tracking-widest">
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Titular</span>
                    <span className="font-bold text-neutral-200 tracking-wider text-sm">
                      BRANDON ALMANZA
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-500 block">Expira</span>
                    <span className="font-mono text-neutral-200 text-sm font-semibold">10/30</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARA TRASERA: Reverso con Banda Magnética y CVV Dinámico */}
            <div className="w-full aspect-[1.586/1] rounded-3xl py-7 flex flex-col justify-between apple-glass-card border border-white/20 shadow-2xl absolute inset-0 rotate-y-180 backface-hidden select-none">
              {/* Banda Magnética */}
              <div className="w-full h-11 bg-neutral-900 border-y border-white/10 mt-1" />

              <div className="px-7 space-y-3">
                <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-2 border border-white/15">
                  <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
                    CVV Dinámico
                  </span>
                  <span className="font-mono text-lg font-extrabold text-emerald-400 tracking-widest">
                    842
                  </span>
                </div>
                <p className="text-[10px] text-neutral-500 leading-tight text-center">
                  Esta tarjeta digital cuenta con tokenización criptográfica y verificación 2FA integrada.
                </p>
              </div>

              <div className="px-7 flex justify-between items-center text-[10px] text-neutral-400">
                <span>BankLite Core Banking</span>
                <span className="font-mono">Hecho en Colombia</span>
              </div>
            </div>
          </div>

          <div className="mt-3 text-center">
            <button
              onClick={() => setCardFlipped(!cardFlipped)}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              <Repeat size={13} />
              Toca para {cardFlipped ? "ver frente" : "ver reverso y CVV"}
            </button>
          </div>
        </div>
      </section>

      {/* BENTO GRID: Apple WWDC Feature Architecture */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-white/[0.08]">
        <div className="text-center mb-16 space-y-3">
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
            Capacidades del Sistema
          </p>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight apple-text-gradient">
            Ingeniería financiera en cada detalle.
          </h2>
          <p className="text-neutral-400 max-w-xl mx-auto text-base">
            Ocho microservicios sincronizados en milisegundos para darte la experiencia más rápida y segura.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Bento 1: Bolsillos de Ahorro (Tarjeta Ancha - 2 Columnas) */}
          <div className="md:col-span-2 apple-glass-card rounded-3xl p-8 flex flex-col justify-between hover:border-white/20 transition-all duration-300 group">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Wallet size={24} />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-white">
                Bolsillos Inteligentes
              </h3>
              <p className="text-neutral-400 text-sm max-w-md leading-relaxed">
                Separa tu dinero en metas específicas con cálculo en vivo. Sin cobros de manejo ni límites de retiro.
              </p>
            </div>

            {/* Simulación visual de bolsillos */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="font-semibold text-neutral-300">🏖️ Viaje Vacaciones</span>
                  <span className="text-emerald-400 font-bold font-mono">82%</span>
                </div>
                <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full w-[82%]" />
                </div>
                <span className="text-[11px] text-neutral-400 mt-2 block font-mono">
                  $1.640.000 / $2.000.000 COP
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="font-semibold text-neutral-300">🚗 Fondo Vehículo</span>
                  <span className="text-cyan-400 font-bold font-mono">50%</span>
                </div>
                <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full w-[50%]" />
                </div>
                <span className="text-[11px] text-neutral-400 mt-2 block font-mono">
                  $3.500.000 / $7.000.000 COP
                </span>
              </div>
            </div>
          </div>

          {/* Bento 2: Clave Dinámica 2FA (WhatsApp + Gmail) */}
          <div className="apple-glass-card rounded-3xl p-8 flex flex-col justify-between hover:border-white/20 transition-all duration-300">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Smartphone size={24} />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-white">
                2FA Multicanal
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Confirmación de acceso enviada al instante a tu WhatsApp vía Green API y a tu correo con Gmail SMTP.
              </p>
            </div>
            <div className="mt-6 p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-center">
              <span className="text-[11px] text-cyan-300 uppercase tracking-widest block font-bold mb-1">
                Clave Dinámica Activa
              </span>
              <span className="font-mono text-3xl font-extrabold text-white tracking-[0.25em]">
                190 442
              </span>
            </div>
          </div>

          {/* Bento 3: Saca Plata / Retiro sin Tarjeta */}
          <div className="apple-glass-card rounded-3xl p-8 flex flex-col justify-between hover:border-white/20 transition-all duration-300">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Zap size={24} />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-white">
                Saca Plata
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Genera tokens temporales de 6 dígitos con vencimiento de 15 minutos para retiros sin plástico en cajeros.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
              <span className="text-neutral-400">Token de retiro:</span>
              <span className="font-mono text-purple-300 font-bold">TOKEN-883412</span>
            </div>
          </div>

          {/* Bento 4: Pagos QR Instantáneos */}
          <div className="apple-glass-card rounded-3xl p-8 flex flex-col justify-between hover:border-white/20 transition-all duration-300">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <QrCode size={24} />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-white">
                Pagos con QR
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Genera y escanea códigos QR interoperables para transferir fondos al instante sin digitar cuentas.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-center py-2">
              <div className="p-3 bg-white rounded-2xl shadow-xl">
                <QrCode size={56} className="text-black" />
              </div>
            </div>
          </div>

          {/* Bento 5: Prevención de Fraude en Tiempo Real */}
          <div className="apple-glass-card rounded-3xl p-8 flex flex-col justify-between hover:border-white/20 transition-all duration-300">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-white">
                Radar Antifraude
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Algoritmos SARLAFT con validación de velocidad, doble partida contable en Ledger y listas restrictivas.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 font-medium">
              <ShieldCheck size={16} />
              <span>Protección 100% de transacciones</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER: Minimalismo Apple */}
      <footer className="border-t border-white/[0.08] bg-black text-neutral-500 text-xs py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-neutral-300">
            <Building2 size={18} />
            <span className="font-bold tracking-tight text-sm text-white">BankLite Core Banking</span>
          </div>
          <p>© {new Date().getFullYear()} BankLite. Inspirado en el diseño fluido y materiales de Apple.</p>
          <div className="flex items-center gap-4 text-neutral-400">
            <Link href="/login" className="hover:text-white transition-colors">
              Portal Clientes
            </Link>
            <span>•</span>
            <Link href="/login" className="hover:text-white transition-colors">
              Acceso Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
