"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Activity, Globe, LogOut } from "lucide-react";
import { Nav } from "@/components/Nav";
import { WizardBanner } from "@/components/WizardBanner";
import { Sesion, cerrarSesion, obtenerSesion } from "@/lib/auth";

/**
 * Envoltorio de toda la app: decide si mostrar el chrome (sidebar + header)
 * o dejar pasar la pantalla de login sola, y protege las rutas del panel
 * exigiendo sesión activa (agregado a pedido del profesor).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null | "cargando">("cargando");

  useEffect(() => {
    const actual = obtenerSesion();
    setSesion(actual);
    if (!actual && pathname !== "/login") {
      router.replace("/login");
    }
  }, [pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (sesion === "cargando") {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        Cargando…
      </div>
    );
  }

  if (!sesion) {
    // Ya se disparó el redirect a /login; no renderizamos el panel mientras tanto.
    return null;
  }

  const nombreCompleto = [sesion.usuario.nombre, sesion.usuario.apellido].filter(Boolean).join(" ");
  const iniciales = (sesion.usuario.nombre?.[0] ?? "") + (sesion.usuario.apellido?.[0] ?? "");

  function handleLogout() {
    cerrarSesion();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col md:flex-row font-sans selection:bg-indigo-500/30">
      {/* Sidebar - Premium Dark Mode */}
      <aside className="w-full md:w-72 bg-corporate-gradient text-slate-300 md:min-h-screen flex flex-col shadow-2xl z-20 relative overflow-hidden">
        <div className="absolute top-0 -left-1/2 w-full h-64 bg-indigo-500/10 blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 -right-1/2 w-full h-64 bg-fuchsia-500/10 blur-[100px] pointer-events-none"></div>

        <div className="p-8 flex items-center gap-4 relative z-10">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/40 animate-fade-in-up">
            <Building2 size={26} strokeWidth={1.5} />
          </div>
          <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <h1 className="text-2xl font-bold text-white tracking-tight leading-none">BankLite</h1>
            <p className="text-[10px] text-indigo-300 font-bold tracking-[0.2em] uppercase mt-1">Core Banking</p>
          </div>
        </div>

        <div className="flex-1 px-5 py-6 overflow-y-auto relative z-10 space-y-8">
          <Nav />

          <div
            className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md animate-fade-in-up"
            style={{ animationDelay: "0.4s" }}
          >
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Activity size={14} className="text-emerald-400 animate-pulse-slow" />
              System Status
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Gateway</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span> Online
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Event Bus</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span> RabbitMQ
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-black/20 text-[11px] text-slate-500 border-t border-white/5 flex items-center justify-between relative z-10">
          <div>
            <p className="font-semibold text-slate-300 flex items-center gap-1">
              <Globe size={12} /> Global Network
            </p>
            <p className="mt-0.5">Enterprise v1.0.0</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[url('/grid.svg')] bg-center relative">
        <header className="h-[72px] bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-10 shadow-sm z-10 sticky top-0">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Centro de Operaciones</h2>
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
              <span className="text-sm font-bold text-slate-900">{nombreCompleto || sesion.usuario.email}</span>
              <span className="text-xs text-slate-500">{sesion.usuario.email}</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white shadow-sm text-indigo-700 font-bold uppercase">
              {iniciales || "U"}
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="h-10 w-10 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="p-6 md:p-10 max-w-[1400px] mx-auto w-full relative z-0">
          <WizardBanner />
          {children}
        </div>
      </main>
    </div>
  );
}
