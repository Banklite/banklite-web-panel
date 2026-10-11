"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import {
  Shield,
  Zap,
  CreditCard,
  Bell,
  ArrowRight,
  Building2,
  Lock,
  CheckCircle,
} from "lucide-react";

const FEATURES = [
  {
    icon: Zap,
    title: "Transferencias instantáneas",
    desc: "Envía dinero a cualquier cuenta en segundos, las 24 horas del día.",
  },
  {
    icon: CreditCard,
    title: "Tarjeta digital",
    desc: "Solicita tu tarjeta al instante y gestiona su bloqueo desde la app.",
  },
  {
    icon: Bell,
    title: "Notificaciones en tiempo real",
    desc: "Entérate de cada movimiento de tu cuenta en el momento en que ocurre.",
  },
  {
    icon: CheckCircle,
    title: "Sin comisiones ocultas",
    desc: "Tarifas claras y transparentes. Lo que ves es lo que pagas.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (sesion) {
      router.replace(sesion.usuario.role === "admin" ? "/admin" : "/cliente");
      return;
    }
    setVerificando(false);
  }, [router]);

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 mx-auto mb-4 flex items-center justify-center text-white">
            <Building2 size={32} />
          </div>
          <p className="text-xl text-brand-700 font-semibold animate-pulse">Cargando BankLite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-700 to-brand-900 text-white">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />

        <nav className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Building2 size={24} />
            </div>
            <span className="text-2xl font-black tracking-tight">BankLite</span>
          </div>
          <Link
            href="/login"
            className="text-sm font-bold px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition"
          >
            Iniciar sesión
          </Link>
        </nav>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-28 text-center">
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-tight">
            BankLite
          </h1>
          <p className="mt-4 text-2xl sm:text-3xl font-semibold text-brand-100">
            Tu banco digital, simple y seguro
          </p>
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
            Abre tu cuenta en minutos, transfiere dinero al instante y controla tus finanzas desde cualquier lugar.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?modo=registro"
              className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 font-black text-lg px-8 py-4 rounded-2xl shadow-xl shadow-brand-900/30 transition"
            >
              Abrir mi cuenta gratis
              <ArrowRight size={22} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border-2 border-white/60 hover:bg-white/10 text-white font-bold text-lg px-8 py-4 rounded-2xl transition"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-brand-900">
            Todo lo que necesitas, en un solo lugar
          </h2>
          <p className="mt-3 text-slate-500 text-lg">
            Una experiencia bancaria pensada para ti.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
            >
              <div className="h-12 w-12 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center mb-4">
                <f.icon size={26} />
              </div>
              <h3 className="text-lg font-bold text-brand-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Seguridad */}
      <section className="bg-brand-50 border-y border-brand-100">
        <div className="max-w-4xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center gap-8">
          <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-lg shadow-brand-500/30 flex-shrink-0">
            <Shield size={48} />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-brand-900">Tu dinero, siempre protegido</h2>
            <p className="mt-2 text-slate-600">
              Verificación de identidad, monitoreo antifraude permanente y cifrado de extremo a extremo en cada operación.
            </p>
            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
              <span className="inline-flex items-center gap-1.5 bg-white border border-brand-100 text-brand-700 text-sm font-semibold px-3 py-1.5 rounded-full">
                <Lock size={14} /> Cifrado seguro
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-brand-100 text-brand-700 text-sm font-semibold px-3 py-1.5 rounded-full">
                <Shield size={14} /> Antifraude 24/7
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-brand-100 text-brand-700 text-sm font-semibold px-3 py-1.5 rounded-full">
                <CheckCircle size={14} /> Verificación KYC
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-black text-brand-900">Empieza hoy con BankLite</h2>
        <Link
          href="/login?modo=registro"
          className="mt-6 inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-black text-lg px-8 py-4 rounded-2xl shadow-lg shadow-brand-500/30 transition"
        >
          Abrir mi cuenta gratis
          <ArrowRight size={22} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-brand-900 text-brand-100">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 size={20} />
            <span className="font-black text-white">BankLite</span>
          </div>
          <p className="text-sm text-brand-100/70">
            © {new Date().getFullYear()} BankLite. Tu banco digital, simple y seguro.
          </p>
        </div>
      </footer>
    </div>
  );
}
